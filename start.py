import subprocess
import sys
import os
import signal
import time

def main():
    print("Starting PR Court Lightweight Setup...")
    
    # Check if we are in the root directory
    if not os.path.exists("backend") or not os.path.exists("src"):
        print("Error: Please run this script from the project root directory.")
        sys.exit(1)

    # Start backend
    print("Starting backend (FastAPI)...")
    backend_proc = subprocess.Popen(
        ["uvicorn", "app.main:app", "--reload", "--port", "8000"],
        cwd="backend",
    )

    # Start frontend
    print("Starting frontend (Vite)...")
    frontend_proc = subprocess.Popen(
        ["npm", "run", "dev"],
        shell=sys.platform == "win32",
    )

    def signal_handler(sig, frame):
        print("\nShutting down PR Court...")
        backend_proc.terminate()
        frontend_proc.terminate()
        backend_proc.wait()
        frontend_proc.wait()
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    try:
        while True:
            time.sleep(1)
            # Check if any process died
            if backend_proc.poll() is not None:
                print("Backend process died unexpectedly.")
                break
            if frontend_proc.poll() is not None:
                print("Frontend process died unexpectedly.")
                break
    except KeyboardInterrupt:
        pass
    finally:
        signal_handler(None, None)

if __name__ == "__main__":
    main()
