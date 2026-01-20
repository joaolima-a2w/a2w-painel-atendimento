@echo off
echo ============================================================
echo  ENCERRANDO SISTEMA A2W
echo ============================================================
echo.

REM Matar processos do uvicorn (API)
taskkill /FI "WINDOWTITLE eq A2W API*" /T /F 2>nul

REM Matar processos do serve (Frontend)
taskkill /FI "WINDOWTITLE eq A2W Frontend*" /T /F 2>nul

REM Matar todos os processos Python (se necessário)
REM taskkill /IM python.exe /F 2>nul

REM Matar todos os processos Node (se necessário)
REM taskkill /IM node.exe /F 2>nul

echo.
echo Sistema encerrado!
echo.
pause
