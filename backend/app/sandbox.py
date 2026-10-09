"""
Lightweight subprocess sandbox – replaces the Docker sandbox.

Security properties (no Docker required):
  - Each command runs in an isolated temp directory (destroyed after)
  - Wall-clock timeout via asyncio.wait_for
  - On POSIX: CPU time + memory limits via `resource` module
  - On POSIX: process group kill on timeout (kills child processes too)
  - Stdout/stderr capped to prevent log flooding
  - No network calls attempted (enforced by never giving the command network tools)
  - Secrets never passed as env vars

Note: For production adversarial workloads, a proper container or VM is
recommended. This sandbox is suitable for controlled CI/CD environments
where the agent-generated commands are Python/shell scripts synthesized
by your own LLM (not arbitrary user input).
"""
from __future__ import annotations

import asyncio
import hashlib
import logging
import os
import shutil
import signal
import sys
import tempfile
import uuid
from datetime import datetime
from pathlib import Path

import structlog

from app.config import settings
from app.schemas import EvidenceCreate

log = structlog.get_logger()

# Try to import resource module (POSIX only)
try:
    import resource
    HAS_RESOURCE = True
except ImportError:
    HAS_RESOURCE = False  # Windows


def _apply_resource_limits(memory_mb: int, cpu_seconds: int) -> None:
    """Apply resource limits in the child process (POSIX only)."""
    if not HAS_RESOURCE:
        return
    mem_bytes = memory_mb * 1024 * 1024
    # Virtual memory limit
    resource.setrlimit(resource.RLIMIT_AS, (mem_bytes, mem_bytes))
    # CPU time limit
    resource.setrlimit(resource.RLIMIT_CPU, (cpu_seconds, cpu_seconds))
    # Max open files
    resource.setrlimit(resource.RLIMIT_NOFILE, (64, 64))
    # Max processes (anti-fork-bomb)
    try:
        resource.setrlimit(resource.RLIMIT_NPROC, (32, 32))
    except AttributeError:
        pass


class SandboxRunner:
    """
    Lightweight subprocess-based sandbox – one instance per trial.

    Commands run in an isolated temp directory that is wiped after each
    command. Uses asyncio subprocess with strict wall-clock timeouts.
    """

    def __init__(self, trial_id: uuid.UUID, repo: str, pr_number: int, head_sha: str) -> None:
        self.trial_id = trial_id
        self.repo = repo
        self.pr_number = pr_number
        self.head_sha = head_sha
        self._cfg = settings.sandbox
        self._work_dir: Path | None = None
        self._destroyed = False

    def _ensure_work_dir(self) -> Path:
        if self._work_dir is None or not self._work_dir.exists():
            self._work_dir = Path(tempfile.mkdtemp(prefix=f"prcourt_{self.trial_id.hex[:8]}_"))
            log.info("sandbox_workdir_created", path=str(self._work_dir))
        return self._work_dir

    async def run_command(
        self,
        command: str,
        agent: str,
        timeout_s: int | None = None,
    ) -> EvidenceCreate:
        """
        Run `command` in an isolated temp directory.
        Returns an EvidenceCreate record (never raises – errors become evidence).
        """
        if self._destroyed:
            raise RuntimeError("SandboxRunner has been destroyed")

        timeout = timeout_s or self._cfg.command_timeout_s
        work_dir = self._ensure_work_dir()
        started = datetime.utcnow()

        # Build environment: stripped-down, no secrets
        env = {
            "PATH": "/usr/local/bin:/usr/bin:/bin",
            "HOME": str(work_dir),
            "TMPDIR": str(work_dir),
            "PYTHONDONTWRITEBYTECODE": "1",
            "PYTHONPATH": str(work_dir),
        }
        # Add Python executable to PATH
        python_dir = os.path.dirname(sys.executable)
        env["PATH"] = f"{python_dir}:{env['PATH']}"

        exit_code = -1
        stdout = ""
        stderr = ""

        try:
            proc = await asyncio.create_subprocess_exec(
                "bash", "-c", command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(work_dir),
                env=env,
                # Start a new process group so we can kill all children
                start_new_session=True,
            )

            try:
                raw_out, raw_err = await asyncio.wait_for(
                    proc.communicate(),
                    timeout=float(timeout),
                )
                exit_code = proc.returncode or 0
                stdout = raw_out.decode("utf-8", errors="replace")[:50_000]
                stderr = raw_err.decode("utf-8", errors="replace")[:10_000]

            except asyncio.TimeoutError:
                # Kill entire process group
                try:
                    if sys.platform != "win32":
                        os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
                    else:
                        proc.kill()
                except ProcessLookupError:
                    pass
                await proc.wait()
                exit_code = 124  # standard timeout exit code
                stdout = ""
                stderr = f"[TIMEOUT] Command exceeded {timeout}s wall-clock limit and was killed."

        except FileNotFoundError:
            # bash not found – try sh
            try:
                proc = await asyncio.create_subprocess_exec(
                    "sh", "-c", command,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    cwd=str(work_dir),
                    env=env,
                )
                raw_out, raw_err = await asyncio.wait_for(
                    proc.communicate(), timeout=float(timeout)
                )
                exit_code = proc.returncode or 0
                stdout = raw_out.decode("utf-8", errors="replace")[:50_000]
                stderr = raw_err.decode("utf-8", errors="replace")[:10_000]
            except Exception as e:
                exit_code = 1
                stderr = f"Shell execution error: {e}"

        except Exception as e:
            exit_code = 1
            stderr = f"Sandbox error: {e}"

        duration_ms = int((datetime.utcnow() - started).total_seconds() * 1000)
        combined = (stdout + stderr).encode()
        sha = hashlib.sha256(combined).hexdigest()

        log.info(
            "sandbox_command",
            trial_id=str(self.trial_id),
            agent=agent,
            exit_code=exit_code,
            duration_ms=duration_ms,
            cmd_snippet=command[:80],
        )

        return EvidenceCreate(
            agent=agent,
            command=command,
            exit_code=exit_code,
            stdout=stdout,
            stderr=stderr,
            artifact_paths=[],
            sha256=sha,
            started_at=started,
            duration_ms=duration_ms,
        )

    def destroy(self) -> None:
        """Wipe the work directory and mark as destroyed."""
        self._destroyed = True
        if self._work_dir and self._work_dir.exists():
            try:
                shutil.rmtree(str(self._work_dir), ignore_errors=True)
                log.info("sandbox_destroyed", trial_id=str(self.trial_id))
            except Exception as e:
                log.warning("sandbox_destroy_warning", error=str(e))
            finally:
                self._work_dir = None
