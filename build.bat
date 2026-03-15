@echo off
echo [Build] Running PyInstaller...
pyinstaller --onefile --console --name="Setup" launcher.py

echo [Build] Setting up MyApp folder...
if not exist MyApp mkdir MyApp

copy dist\Setup.exe MyApp\Setup.exe
copy app.py MyApp\app.py

xcopy /E /I /Y src MyApp\src
xcopy /E /I /Y data MyApp\data
xcopy /E /I /Y tests MyApp\tests

echo.
echo [Build] Done! MyApp folder is ready to send to users.
