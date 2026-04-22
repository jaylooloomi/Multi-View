# Multi-View Chrome Extension Packer
# 雙擊 pack.bat 執行，自動打包成 dist/multi-view-v{version}.zip

$root  = Split-Path $MyInvocation.MyCommand.Path
$dist  = Join-Path $root "dist"
$stage = Join-Path $dist "_stage"

# 從 manifest.json 讀取版本號
$version = (Get-Content (Join-Path $root "manifest.json") -Raw | ConvertFrom-Json).version
$zip     = Join-Path $dist "multi-view-v$version.zip"

Write-Host ""
Write-Host " [Multi-View Packer]  version $version" -ForegroundColor Cyan
Write-Host " 輸出路徑: $zip"
Write-Host ""

# 建立暫存目錄
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item $stage -ItemType Directory | Out-Null
if (!(Test-Path $dist)) { New-Item $dist -ItemType Directory | Out-Null }

# 需要打包的檔案清單
$files = @(
    "manifest.json",
    "background.js",
    "content_script.js",
    "i18n.js",
    "url_converter.js",
    "sidepanel.html",
    "sidepanel.js",
    "sidepanel.css",
    "icon16.png",
    "icon32.png",
    "icon48.png",
    "icon128.png"
)

Write-Host " [1/3] 複製檔案..." -ForegroundColor Yellow
foreach ($f in $files) {
    $src = Join-Path $root $f
    if (Test-Path $src) {
        Copy-Item $src $stage
        Write-Host "       + $f"
    } else {
        Write-Host "       ! 找不到: $f" -ForegroundColor Red
    }
}

# 複製 icons 資料夾
$iconsDir = Join-Path $root "icons"
if (Test-Path $iconsDir) {
    Copy-Item $iconsDir $stage -Recurse
    Write-Host "       + icons/"
}

Write-Host ""
Write-Host " [2/3] 壓縮中..." -ForegroundColor Yellow
if (Test-Path $zip) { Remove-Item $zip }
Compress-Archive -Path "$stage\*" -DestinationPath $zip -Force

Write-Host " [3/3] 清除暫存..." -ForegroundColor Yellow
Remove-Item $stage -Recurse -Force

Write-Host ""
Write-Host " ✓ 打包完成！" -ForegroundColor Green
Write-Host " 檔案位置: $zip" -ForegroundColor Green
Write-Host ""

# 開啟 dist 資料夾
Start-Process explorer $dist
