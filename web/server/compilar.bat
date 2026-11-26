@echo off
rem Compila "Diario del Cazador.exe" en la raiz del repositorio.
cd /d "%~dp0"
"%WINDIR%\Microsoft.NET\Framework64\v4.0.30319\csc.exe" /nologo /optimize /target:winexe /r:System.Windows.Forms.dll /r:System.Drawing.dll /out:"..\..\Diario del Cazador.exe" DiarioDelCazador.cs
