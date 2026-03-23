@echo off
echo [Build] Running PyInstaller with Python 3.10...
py -3.10 -m PyInstaller --onefile --console --name="Setup" launcher.py

echo [Build] Copying Setup.exe to root...
copy dist\Setup.exe Setup.exe

echo.
echo [Build] Done! Files are ready in root directory.
echo.
echo   Root/
echo   ├── Setup.exe
echo   ├── app.py
echo   ├── src/
echo   ├── data/
echo   └── tests/
echo.