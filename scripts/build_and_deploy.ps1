$GodotPath = "C:\Users\user\Desktop\Godot_v4.3-stable_win64.exe\Godot_v4.3-stable_win64.exe"
$ExportPreset = "Web"
$GodotProjectDir = "$PSScriptRoot\..\videoeditorgodot"
$BuildDir = "$PSScriptRoot\..\build\web\video-editor-godot"
$PortfolioPath = "C:\Users\user\Documents\GitHub\portfolio\public\games\video-editor-godot"

# 1. Create Build Directory
if (!(Test-Path $BuildDir)) {
    New-Item -ItemType Directory -Path $BuildDir -Force
}

# 2. Run Godot Export
Write-Host "Exporting Godot project to Web..."
Push-Location $GodotProjectDir
& $GodotPath --headless --verbose --export-release $ExportPreset "$BuildDir/index.html" > "$BuildDir/godot_export.log" 2>&1
$ExportExitCode = $LASTEXITCODE
Pop-Location

if ($ExportExitCode -ne 0) {
    Get-Content "$BuildDir/godot_export.log"
    Write-Error "Godot export failed with exit code $ExportExitCode"
    exit $ExportExitCode
}

# 3. Create Portfolio Directory
if (!(Test-Path $PortfolioPath)) {
    New-Item -ItemType Directory -Path $PortfolioPath -Force
}

# 4. Copy Build Files to Portfolio
Write-Host "Copying files to portfolio..."
Copy-Item -Path "$BuildDir\*" -Destination $PortfolioPath -Recurse -Force

Write-Host "Build and deployment completed successfully!"
