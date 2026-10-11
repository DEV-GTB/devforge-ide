@echo off
echo Installing VS Code extensions for devforge-ai project...
echo.

echo Installing ESLint...
code --install-extension dbaeumer.vscode-eslint
if %errorlevel% neq 0 echo Failed to install ESLint
echo.

echo Installing Prettier...
code --install-extension esbenp.prettier-vscode
if %errorlevel% neq 0 echo Failed to install Prettier
echo.

echo Installing Tailwind CSS IntelliSense...
code --install-extension bradlc.vscode-tailwindcss
if %errorlevel% neq 0 echo Failed to install Tailwind CSS IntelliSense
echo.

echo Installing TypeScript Importer...
code --extensionInstall rbbon.typescript-importer
if %errorlevel% neq 0 echo Failed to install TypeScript Importer
echo.

echo Installing Auto Rename Tag...
code --install-extension formulahendry.auto-rename-tag
if %errorlevel% neq 0 echo Failed to install Auto Rename Tag
echo.

echo Installing Path Intellisense...
code --install-extension christian-kohler.path-intellisense
if %errorlevel% neq 0 echo Failed to install Path Intellisense
echo.

echo Installing GitLens...
code --install-extension eamodio.gitlens
if %errorlevel% neq 0 echo Failed to install GitLens
echo.

echo Installing GitHub Copilot...
code --install-extension GitHub.copilot
if %errorlevel% neq 0 echo Failed to install GitHub Copilot
echo.

echo Installing Live Server...
code --install-extension ritwickdey.liveserver
if %errorlevel% neq 0 echo Failed to install Live Server
echo.

echo.
echo All extensions installation complete!
echo.
echo Recommended VS Code Settings:
echo - Font: Fira Code or JetBrains Mono
echo - Theme: Dark+ (or any dark theme)
echo - Icon Theme: Material Icon Theme
echo - File Explorer: Compact folders
echo.
echo Useful VS Code Shortcuts:
echo - Ctrl+Shift+P - Command Palette
echo - Ctrl+` - Toggle terminal
echo - Ctrl+B - Toggle sidebar
echo - Ctrl+P - Quick open file
echo - Ctrl+Shift+E - Focus explorer
echo - F12 - Go to definition
echo - Shift+F12 - Peek definition
echo.
pause
