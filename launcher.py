import subprocess
import sys
import os
import platform

OS = platform.system()

PACKAGES = ["pywebview"]

def find_python():
    candidates = ["python", "python3", "py"]
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

def get_base_dir():
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))

def get_venv_python(venv_dir):
    if OS == "Windows":
        return os.path.join(venv_dir, "Scripts", "python.exe")
    return os.path.join(venv_dir, "bin", "python")

def get_venv_pip(venv_dir):
    if OS == "Windows":
        return os.path.join(venv_dir, "Scripts", "pip.exe")
    return os.path.join(venv_dir, "bin", "pip")

def create_venv(venv_dir, python_cmd):
    if os.path.exists(get_venv_python(venv_dir)):
        print("  [OK] Virtual environment already exists.")
        return

    print("  [>>] Creating virtual environment...")
    result = subprocess.run(
        [python_cmd, "-m", "venv", venv_dir],
        capture_output=True, text=True
    )
    if result.returncode == 0:
        print("  [OK] Virtual environment created!")
    else:
        print("  [FAIL] Failed to create virtual environment!")
        print(result.stderr)
        input("\nPress Enter to exit...")
        sys.exit(1)

def install_packages(venv_dir):
    pip_cmd = get_venv_pip(venv_dir)

    for package in PACKAGES:
        # Check if already installed in venv
        check = subprocess.run(
            [pip_cmd, "show", package],
            capture_output=True, text=True
        )
        if check.returncode == 0:
            print(f"  [OK] {package} already installed.")
        else:
            print(f"  [>>] Installing {package}... (please wait)")
            process = subprocess.Popen(
                [pip_cmd, "install", package,
                 "--disable-pip-version-check"],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True
            )
            for line in process.stdout:
                line = line.strip()
                if line:
                    print(f"    {line}")
            process.wait()

            if process.returncode == 0:
                print(f"  [OK] {package} installed successfully!")
            else:
                print(f"\n  [FAIL] Failed to install {package}!")
                if OS == "Windows":
                    print("         Try running Setup.exe as Administrator.")
                else:
                    print("         Try running: sudo python3 launcher.py")
                input("\nPress Enter to exit...")
                sys.exit(1)

def launch_app(venv_dir):
    base_dir = get_base_dir()
    app_path = os.path.join(base_dir, "app.py")
    venv_python = get_venv_python(venv_dir)

    if not os.path.exists(app_path):
        print(f"\n  [FAIL] app.py not found in: {base_dir}")
        print("         Make sure app.py is in the same folder as Setup.exe")
        input("\nPress Enter to exit...")
        sys.exit(1)

    if not os.path.exists(venv_python):
        print(f"\n  [FAIL] Venv Python not found: {venv_python}")
        input("\nPress Enter to exit...")
        sys.exit(1)

    print("\n  [>>] Launching app...\n")
    subprocess.run([venv_python, app_path])

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
        print("         Make sure to check 'Add Python to PATH' during install.")
        input("\nPress Enter to exit...")
        sys.exit(1)

    version = subprocess.run(
        [python_cmd, "--version"],
        capture_output=True, text=True
    ).stdout.strip()
    print(f"  [OK] {version} detected.")
    print()

    # Set venv location next to Setup.exe
    base_dir = get_base_dir()
    venv_dir = os.path.join(base_dir, ".venv")
    print(f"  [OK] Venv location: {venv_dir}")
    print()

    # Create venv using user's Python
    create_venv(venv_dir, python_cmd)

    print()
    print("  Checking dependencies...")
    print()

    # Install packages into venv
    install_packages(venv_dir)

    print()
    print("================================================")
    print("  [OK] All dependencies satisfied.")
    print("================================================")
    print()

    # Launch app using venv Python
    launch_app(venv_dir)

if __name__ == "__main__":
    main()