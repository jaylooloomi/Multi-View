# Multi-View Chrome Extension Packer

$root  = Split-Path $MyInvocation.MyCommand.Path
$dist  = Join-Path $root "dist"
$stage = Join-Path $dist "_stage"

# Read version from manifest.json
$version = (Get-Content (Join-Path $root "manifest.json") -Raw | ConvertFrom-Json).version
$zip     = Join-Path $dist "multi-view-v$version.zip"

Write-Host ""
Write-Host " [Multi-View Packer]  version $version" -ForegroundColor Cyan
Write-Host " Output: $zip"
Write-Host ""

# Create staging directory
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item $stage -ItemType Directory | Out-Null
if (!(Test-Path $dist)) { New-Item $dist -ItemType Directory | Out-Null }

# Files to include
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

Write-Host " [1/3] Copying files..." -ForegroundColor Yellow
foreach ($f in $files) {
    $src = Join-Path $root $f
    if (Test-Path $src) {
        Copy-Item $src $stage
        Write-Host "       + $f"
    } else {
        Write-Host "       ! Not found: $f" -ForegroundColor Red
    }
}

$iconsDir = Join-Path $root "icons"
if (Test-Path $iconsDir) {
    Copy-Item $iconsDir $stage -Recurse
    Write-Host "       + icons/"
}

Write-Host ""
Write-Host " [2/3] Compressing..." -ForegroundColor Yellow
if (Test-Path $zip) { Remove-Item $zip }
Compress-Archive -Path "$stage\*" -DestinationPath $zip -Force

Write-Host " [3/3] Cleaning up..." -ForegroundColor Yellow
Remove-Item $stage -Recurse -Force

Write-Host ""
Write-Host " Done! $zip" -ForegroundColor Green
Write-Host ""

Start-Process explorer $dist
