import subprocess
import sys
import os
import importlib
import platform

OS = platform.system()

WINDOWS_PACKAGES = [
    ("pywebview", "webview"),
]

MAC_PACKAGES = [
    ("pyobjc-core",              "objc"),
    ("pyobjc-framework-Cocoa",   "AppKit"),
    ("pyobjc-framework-WebKit",  "WebKit"),
    ("pywebview",                "webview"),
]

LINUX_PACKAGES = [
    ("pywebview", "webview"),
]

def get_packages():
    if OS == "Windows":
        return WINDOWS_PACKAGES
    elif OS == "Darwin":
        return MAC_PACKAGES
    else:
        return LINUX_PACKAGES

def is_admin():
    if OS != "Windows":
        return True
    try:
        import ctypes
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False

def run_as_admin():
    if OS == "Windows":
        import ctypes
        ctypes.windll.shell32.ShellExecuteW(
            None, "runas", sys.executable, " ".join(sys.argv), None, 1
        )
        sys.exit()

def pip_install(package):
    process = subprocess.Popen(
        [sys.executable, "-m", "pip", "install", package,
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
    return process.returncode == 0

def install_packages():
    packages = get_packages()
    installed_any = False

    for pip_name, import_name in packages:
        try:
            importlib.import_module(import_name)
            print(f"  [OK] {pip_name} already installed.")
        except ImportError:
            print(f"  [>>] Installing {pip_name}... (please wait)")
            success = pip_install(pip_name)
            if success:
                print(f"  [OK] {pip_name} installed successfully!")
                installed_any = True
            else:
                print(f"\n  [FAIL] Failed to install {pip_name}!")
                if OS == "Windows":
                    print("        Try running Setup.exe as Administrator.")
                elif OS == "Darwin":
                    print("        Try running: sudo python3 launcher.py")
                input("\nPress Enter to exit...")
                sys.exit(1)

    return installed_any

def install_mac_dependencies():
    print("  [>>] Checking Homebrew and system dependencies...")
    brew_check = subprocess.run(["which", "brew"], capture_output=True, text=True)

    if brew_check.returncode != 0:
        print("  [!] Homebrew not found. Installing Homebrew...")
        brew_install = subprocess.run(
            '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"',
            shell=True
        )
        if brew_install.returncode != 0:
            print("  [FAIL] Failed to install Homebrew.")
            print("         Please install manually: https://brew.sh")
            input("\nPress Enter to exit...")
            sys.exit(1)
        print("  [OK] Homebrew installed!")
    else:
        print("  [OK] Homebrew already installed.")

def launch_app():
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
    subprocess.run([sys.executable, app_path])

def main():
    print("================================================")
    print("            Application Setup                   ")
    print("================================================")
    print()
    print(f"  [OK] OS detected: {OS}")
    print(f"  [OK] Python {sys.version.split()[0]} detected.")
    print()

    if OS == "Windows" and not is_admin():
        print("  [!] Requesting admin privileges...")
        run_as_admin()
    elif OS == "Windows":
        print("  [OK] Running as Administrator.")

    if OS == "Darwin":
        install_mac_dependencies()

    print()
    print("  Checking Python dependencies...")
    print()

    installed_any = install_packages()

    print()
    print("================================================")
    if installed_any:
        print("  [OK] Setup complete! All packages installed.")
    else:
        print("  [OK] All dependencies already satisfied.")
    print("================================================")
    print()

    launch_app()

if __name__ == "__main__":
    main()