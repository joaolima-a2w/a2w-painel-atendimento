@echo off
title Agente A2W Auto Login
color 0A
cls

echo ============================================================
echo  AGENTE DESKTOP A2W - AUTO LOGIN
echo ============================================================
echo.

REM Verificar se venv existe
if not exist "venv" (
    echo Criando ambiente virtual...
    python -m venv venv
    echo.
)

REM Ativar venv
call venv\Scripts\activate

REM Instalar dependências se necessário
if not exist "venv\Lib\site-packages\flask" (
    echo Instalando dependencias...
    pip install -r requirements_agente.txt
    echo.
    echo Instalando navegador Chromium...
    playwright install chromium
    echo.
)

REM Rodar agente
python agente_autologin.py

pause
