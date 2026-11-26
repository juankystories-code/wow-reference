@echo off
rem Compila "Diario del Cazador.exe" en la raiz del repositorio.
cd /d "%~dp0"
"%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe" /nologo /optimize /target:exe /out:"..\..\Diario del Cazador.exe" DiarioDelCazador.cs
