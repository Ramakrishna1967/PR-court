"""
GitHub App webhook: POST /api/webhooks/github

Verifies HMAC-SHA256 signature, handles pull_request opened/synchronize,
starts a trial, and posts the verdict as a PR comment.
"""
from __future__ import annotations

import hashlib
import hmac
import logging

import httpx
import structlog
from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Request
from sqlalchemy import select

from app.config import settings
from app.database import AsyncSessionLocal, Trial
from app.schemas import TrialStatus

log = structlog.get_logger()
router = APIRouter(tags=["webhook"])


def _verify_signature(body: bytes, signature: str, secret: str) -> bool:
    if not secret:
        return True   # no secret configured → skip check (dev only)
    expected = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


async def _post_pr_comment(repo: str, pr_number: int, body: str) -> None:
    """Post a comment on the GitHub PR with the verdict."""
    if not settings.github_app_private_key or not settings.github_app_id:
        log.warning("github_app_not_configured")
        return

    url = f"https://api.github.com/repos/{repo}/issues/{pr_number}/comments"
    try:
        async with httpx.AsyncClient() as client:
            # In production: use a proper JWT signed with the app private key.
            # For now, use token from env if available.
            headers = {"Accept": "application/vnd.github+json"}
            resp = await client.post(url, json={"body": body}, headers=headers, timeout=10)
            log.info("github_comment_posted", status=resp.status_code)
    except Exception as e:
        log.error("github_comment_failed", error=str(e))


async def _handle_pr_event(repo: str, pr_number: int, head_sha: str) -> None:
    """Create and run a trial, then post the verdict as a PR comment."""
    from app.database import Trial, TrialStatus as DBTrialStatus
    from app.routers.trials import _start_trial

    async with AsyncSessionLocal() as db:
        trial = Trial(
            repo=repo,
            pr_number=pr_number,
            head_sha=head_sha,
            status=TrialStatus.QUEUED,
        )
        db.add(trial)
        await db.commit()
        await db.refresh(trial)
        trial_id = trial.id

    log.info("webhook_trial_created", trial_id=str(trial_id))
    await _start_trial(trial_id, repo, pr_number)

    # Fetch result and post comment
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Trial).where(Trial.id == trial_id))
        t = result.scalar_one_or_none()
        if not t:
            return

    verdict_text = t.verdict.value if t.verdict else "INCONCLUSIVE"
    summary = t.summary or "No summary available."
    comment = (
        f"## 🏛️ PR Court Verdict: **{verdict_text}**\n\n"
        f"{summary}\n\n"
        f"[View full trial →](https://prcourt.dev/trial/{trial_id})"
    )
    await _post_pr_comment(repo, pr_number, comment)


@router.post("/webhooks/github", status_code=202)
async def github_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_hub_signature_256: str = Header(""),
    x_github_event: str = Header(""),
) -> dict:
    body = await request.body()

    if not _verify_signature(body, x_hub_signature_256, settings.github_webhook_secret):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    if x_github_event != "pull_request":
        return {"status": "ignored", "event": x_github_event}

    import json
    payload = json.loads(body)
    action = payload.get("action", "")

    if action not in ("opened", "synchronize", "reopened"):
        return {"status": "ignored", "action": action}

    pr = payload.get("pull_request", {})
    repo_data = payload.get("repository", {})
    repo = repo_data.get("full_name", "")
    pr_number = pr.get("number", 0)
    head_sha = pr.get("head", {}).get("sha", "")

    if not repo or not pr_number:
        raise HTTPException(status_code=400, detail="Missing repo or pr_number in payload")

    log.info("webhook_received", repo=repo, pr_number=pr_number, action=action)
    background_tasks.add_task(_handle_pr_event, repo, pr_number, head_sha)

    return {"status": "accepted", "repo": repo, "pr_number": pr_number}
