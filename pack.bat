@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

:: ── 設定路徑 ────────────────────────────────────────────────
set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"
set "DIST=%ROOT%\dist"
set "STAGE=%DIST%\_stage"

:: ── 從 manifest.json 讀取版本號 ─────────────────────────────
for /f "usebackq delims=" %%v in (`powershell -NoProfile -Command ^
  "(Get-Content '%ROOT%\manifest.json' -Raw | ConvertFrom-Json).version"`) do set "VERSION=%%v"

set "ZIP=%DIST%\multi-view-v%VERSION%.zip"

echo.
echo  [Multi-View Packer]  version %VERSION%
echo  輸出路徑: %ZIP%
echo.

:: ── 建立暫存目錄 ─────────────────────────────────────────────
if exist "%STAGE%" rd /s /q "%STAGE%"
mkdir "%STAGE%"
mkdir "%DIST%" 2>nul

:: ── 複製必要檔案 ─────────────────────────────────────────────
echo  [1/3] 複製檔案...

copy /y "%ROOT%\manifest.json"      "%STAGE%\" >nul
copy /y "%ROOT%\background.js"      "%STAGE%\" >nul
copy /y "%ROOT%\content_script.js"  "%STAGE%\" >nul
copy /y "%ROOT%\i18n.js"            "%STAGE%\" >nul
copy /y "%ROOT%\url_converter.js"   "%STAGE%\" >nul
copy /y "%ROOT%\sidepanel.html"     "%STAGE%\" >nul
copy /y "%ROOT%\sidepanel.js"       "%STAGE%\" >nul
copy /y "%ROOT%\sidepanel.css"      "%STAGE%\" >nul
copy /y "%ROOT%\icon16.png"         "%STAGE%\" >nul
copy /y "%ROOT%\icon32.png"         "%STAGE%\" >nul
copy /y "%ROOT%\icon48.png"         "%STAGE%\" >nul
copy /y "%ROOT%\icon128.png"        "%STAGE%\" >nul

:: ── 複製 icons 資料夾 ────────────────────────────────────────
xcopy /e /i /q "%ROOT%\icons" "%STAGE%\icons" >nul

:: ── 壓縮成 zip ───────────────────────────────────────────────
echo  [2/3] 壓縮中...

if exist "%ZIP%" del /q "%ZIP%"

powershell -NoProfile -Command ^
  "Compress-Archive -Path '%STAGE%\*' -DestinationPath '%ZIP%' -Force"

:: ── 清除暫存目錄 ─────────────────────────────────────────────
echo  [3/3] 清除暫存...
rd /s /q "%STAGE%"

:: ── 完成 ─────────────────────────────────────────────────────
echo.
echo  ✓ 打包完成！
echo  檔案位置: %ZIP%
echo.

:: 開啟 dist 資料夾
explorer "%DIST%"

pause
