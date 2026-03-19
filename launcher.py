import subprocess
import sys
import os
import platform

OS = platform.system()

def find_python():
    """Find the correct Python installation on the user's machine"""
    candidates = [
        "python",
        "python3",
        "py",
    ]
    for cmd in candidates:
        try:
            result = subprocess.run(
                [cmd, "--version"],
                capture_output=True, text=True
            )
            if result.returncode == 0:
                return cmd
        except FileNotFoundError:
            continue
    return None

def install_packages(python_cmd):
    PACKAGES = ["pywebview"]

    for package in PACKAGES:
        # Check if already installed
        check = subprocess.run(
            [python_cmd, "-m", "pip", "show", package],
            capture_output=True, text=True
        )
        if check.returncode == 0:
            print(f"  [OK] {package} already installed.")
        else:
            print(f"  [>>] Installing {package}... (please wait)")
            result = subprocess.Popen(
                [python_cmd, "-m", "pip", "install", package,
                 "--disable-pip-version-check"],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True
            )
            for line in result.stdout:
                line = line.strip()
                if line:
                    print(f"    {line}")
            result.wait()

            if result.returncode == 0:
                print(f"  [OK] {package} installed successfully!")
            else:
                print(f"\n  [FAIL] Failed to install {package}!")
                print("         Try running Setup.exe as Administrator.")
                input("\nPress Enter to exit...")
                sys.exit(1)

def launch_app(python_cmd):
    if getattr(sys, 'frozen', False):
        base_dir = os.path.dirname(sys.executable)
    else:
        base_dir = os.path.dirname(os.path.abspath(__file__))

    app_path = os.path.join(base_dir, "app.py")

    if not os.path.exists(app_path):
        print(f"\n  [FAIL] app.py not found in: {base_dir}")
        print("         Make sure app.py is in the same folder as Setup.exe")
        input("\nPress Enter to exit...")
        sys.exit(1)

    print("\n  [>>] Launching app...\n")
    # Use the USER'S Python, not the bundled one
    subprocess.run([python_cmd, app_path])

def main():
    print("================================================")
    print("            Application Setup                   ")
    print("================================================")
    print()
    print(f"  [OK] OS detected: {OS}")
    print()

    # Find Python on user's machine
    python_cmd = find_python()
    if not python_cmd:
        print("  [FAIL] Python not found!")
        print("         Please install Python from https://www.python.org/downloads/")
        print("         Make sure to check 'Add Python to PATH' during installation.")
        input("\nPress Enter to exit...")
        sys.exit(1)

    # Get version info
    version = subprocess.run(
        [python_cmd, "--version"],
        capture_output=True, text=True
    ).stdout.strip()
    print(f"  [OK] {version} detected.")
    print(f"  [OK] Python path: {python_cmd}")
    print()

    print("  Checking Python dependencies...")
    print()

    install_packages(python_cmd)

    print()
    print("================================================")
    print("  [OK] All dependencies satisfied.")
    print("================================================")
    print()

    launch_app(python_cmd)

if __name__ == "__main__":
    main()