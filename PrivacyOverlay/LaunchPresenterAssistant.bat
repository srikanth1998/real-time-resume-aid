@echo off
echo Launching Presenter Assistant...
echo This overlay should be hidden from screen sharing applications.

:: Run the PowerShell script with elevated permissions to enable the cloaking feature
powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0PresenterAssistant.ps1"
