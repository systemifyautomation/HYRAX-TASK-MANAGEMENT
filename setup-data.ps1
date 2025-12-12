# Setup data files from templates
Write-Host "Setting up data files from templates..." -ForegroundColor Cyan

$dataPath = "server/data"
$templates = Get-ChildItem "$dataPath/*.json.template"

if ($templates.Count -eq 0) {
    Write-Host "No template files found!" -ForegroundColor Red
    exit 1
}

foreach ($template in $templates) {
    $targetFile = $template.FullName -replace '\.template$', ''
    $targetName = Split-Path $targetFile -Leaf
    
    if (Test-Path $targetFile) {
        Write-Host "  ⚠️  $targetName already exists - skipping" -ForegroundColor Yellow
    } else {
        Copy-Item $template.FullName $targetFile
        Write-Host "  ✅ Created $targetName" -ForegroundColor Green
    }
}

Write-Host "`nSetup complete!" -ForegroundColor Green
Write-Host "Data files are ready in server/data/" -ForegroundColor Cyan
