@echo off
set ANDROID_HOME=C:\Users\timbe\AppData\Local\Android\Sdk
set PATH=%ANDROID_HOME%\platform-tools;%PATH%
cd /d "%~dp0"
echo.
echo ========================================
echo  ひみつのデコ・ガーデン 開発サーバー
echo ========================================
echo.
echo iPhone で Expo Go を起動してQRを読んでください
echo (App Store で "Expo Go" を検索してインストール)
echo.
npx expo start --tunnel --clear
pause
