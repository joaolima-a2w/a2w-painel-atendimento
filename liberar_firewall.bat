@echo off
echo Liberando portas no Firewall...

netsh advfirewall firewall add rule name="A2W - API FastAPI" dir=in action=allow protocol=TCP localport=8000
netsh advfirewall firewall add rule name="A2W - Frontend React" dir=in action=allow protocol=TCP localport=3000

echo.
echo Firewall configurado!
pause
