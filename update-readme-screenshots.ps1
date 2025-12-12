# Update README with Local Screenshots
# This script replaces placeholder URLs with local screenshot paths

Write-Host "=== Updating README with Local Screenshots ===" -ForegroundColor Magenta

# Check if screenshots exist
$screenshotDir = "screenshots"
$requiredScreenshots = @(
    "login.png",
    "dashboard-admin.png", 
    "user-management.png",
    "add-user.png",
    "campaigns-list.png",
    "campaign-detail.png",
    "weekly-view.png",
    "mobile-view.png"
)

Write-Host "Checking for required screenshots..." -ForegroundColor Yellow

$missingFiles = @()
foreach ($screenshot in $requiredScreenshots) {
    $filePath = Join-Path $screenshotDir $screenshot
    if (Test-Path $filePath) {
        Write-Host "✓ Found: $screenshot" -ForegroundColor Green
    } else {
        Write-Host "✗ Missing: $screenshot" -ForegroundColor Red
        $missingFiles += $screenshot
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host "`nMissing screenshots. Please capture them first using:" -ForegroundColor Red
    Write-Host "  .\capture-screenshots.ps1" -ForegroundColor Yellow
    exit 1
}

# Read the current README content
$readmePath = "README.md"
$content = Get-Content $readmePath -Raw

Write-Host "`nUpdating README.md..." -ForegroundColor Yellow

# Replace placeholder URLs with local paths
$updatedContent = $content

# Login Screen
$updatedContent = $updatedContent -replace 'https://via\.placeholder\.com/800x600/1a1b23/ffffff\?text=HYRAX\+Login\+Screen[^)]*', 'screenshots/login.png'

# Admin Dashboard  
$updatedContent = $updatedContent -replace 'https://via\.placeholder\.com/1200x800/1a1b23/ffffff\?text=SUPER\+ADMIN\+DASHBOARD[^)]*', 'screenshots/dashboard-admin.png'

# User Management
$updatedContent = $updatedContent -replace 'https://via\.placeholder\.com/1200x800/1a1b23/ffffff\?text=USER\+MANAGEMENT[^)]*', 'screenshots/user-management.png'

# Campaigns List
$updatedContent = $updatedContent -replace 'https://via\.placeholder\.com/1200x800/1a1b23/ffffff\?text=CAMPAIGNS\+MANAGEMENT[^)]*', 'screenshots/campaigns-list.png'

# Weekly View
$updatedContent = $updatedContent -replace 'https://via\.placeholder\.com/1200x800/1a1b23/ffffff\?text=WEEKLY\+PLANNING\+VIEW[^)]*', 'screenshots/weekly-view.png'

# Mobile Interface
$updatedContent = $updatedContent -replace 'https://via\.placeholder\.com/400x800/1a1b23/ffffff\?text=MOBILE\+INTERFACE[^)]*', 'screenshots/mobile-view.png'

# Write the updated content back to README
Set-Content -Path $readmePath -Value $updatedContent -NoNewline

Write-Host "✓ README.md updated with local screenshot paths!" -ForegroundColor Green

# Create a section for Add User Modal and Campaign Detail if not present
$addUserLine = "![Add User Modal](screenshots/add-user.png)"
$campaignDetailLine = "![Campaign Detail](screenshots/campaign-detail.png)"

if ($updatedContent -notmatch "add-user\.png") {
    Write-Host "Adding Add User Modal screenshot reference..." -ForegroundColor Yellow
    # Insert after User Management section
    $insertPoint = $updatedContent.IndexOf("![User Management](screenshots/user-management.png)")
    if ($insertPoint -ge 0) {
        $insertAfter = $updatedContent.IndexOf("`n", $insertPoint) + 1
        $beforeInsert = $updatedContent.Substring(0, $insertAfter)
        $afterInsert = $updatedContent.Substring($insertAfter)
        $updatedContent = $beforeInsert + "`n*Add user modal with role selection*`n`n" + $addUserLine + "`n" + $afterInsert
        Set-Content -Path $readmePath -Value $updatedContent -NoNewline
    }
}

if ($updatedContent -notmatch "campaign-detail\.png") {
    Write-Host "Adding Campaign Detail screenshot reference..." -ForegroundColor Yellow
    # Insert after Campaigns section  
    $insertPoint = $updatedContent.IndexOf("![Campaigns List](screenshots/campaigns-list.png)")
    if ($insertPoint -ge 0) {
        $insertAfter = $updatedContent.IndexOf("`n", $insertPoint) + 1
        $beforeInsert = $updatedContent.Substring(0, $insertAfter)
        $afterInsert = $updatedContent.Substring($insertAfter)
        $updatedContent = $beforeInsert + "`n*Individual campaign with task breakdown*`n`n" + $campaignDetailLine + "`n" + $afterInsert
        Set-Content -Path $readmePath -Value $updatedContent -NoNewline
    }
}

Write-Host "`n=== README Update Complete! ===" -ForegroundColor Green
Write-Host "Your README.md now uses local screenshots from the screenshots/ directory" -ForegroundColor Cyan

# Show a summary
Write-Host "`nScreenshot Files:" -ForegroundColor Yellow
Get-ChildItem $screenshotDir -Name | ForEach-Object { 
    $size = (Get-Item "screenshots/$_").Length / 1KB
    Write-Host "  $_ ($('{0:N1}' -f $size) KB)" -ForegroundColor White 
}