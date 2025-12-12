# HYRAX Screenshot Automation Script
# This script will automatically capture screenshots of the HYRAX application

# Add required assemblies for screenshot capture
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Function to take a screenshot
function Take-Screenshot {
    param(
        [string]$FilePath,
        [string]$Description
    )
    
    Write-Host "Capturing: $Description" -ForegroundColor Green
    
    # Create screenshot
    $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
    $bitmap = New-Object System.Drawing.Bitmap $bounds.width, $bounds.height
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.size)
    
    # Save the screenshot
    $bitmap.Save($FilePath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    # Cleanup
    $graphics.Dispose()
    $bitmap.Dispose()
    
    Write-Host "Saved: $FilePath" -ForegroundColor Cyan
}

# Function to open URL in default browser and wait
function Open-URLAndWait {
    param(
        [string]$Url,
        [int]$WaitSeconds = 3
    )
    
    Write-Host "Opening: $Url" -ForegroundColor Yellow
    Start-Process $Url
    Start-Sleep -Seconds $WaitSeconds
}

# Create screenshots directory if it doesn't exist
$screenshotDir = "screenshots"
if (!(Test-Path $screenshotDir)) {
    New-Item -ItemType Directory -Path $screenshotDir
    Write-Host "Created screenshots directory" -ForegroundColor Green
}

Write-Host "=== HYRAX Screenshot Automation ===" -ForegroundColor Magenta
Write-Host "Make sure the application is running on http://localhost:5174" -ForegroundColor Yellow
Write-Host "Press any key when ready to start capturing screenshots..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Screenshot 1: Login Page
Write-Host "`n1. Login Page Screenshot" -ForegroundColor Magenta
Open-URLAndWait -Url "http://localhost:5174" -WaitSeconds 5
Write-Host "Position your browser window to show the login page, then press any key..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Take-Screenshot -FilePath "$screenshotDir/login.png" -Description "Login Interface"

# Give instructions for the next screenshots
Write-Host "`n2. Please login with: admin@hyrax.com / HyraxAdmin2024!SecurePass" -ForegroundColor Yellow
Write-Host "Press any key when you're logged in and on the dashboard..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Screenshot 2: Admin Dashboard
Take-Screenshot -FilePath "$screenshotDir/dashboard-admin.png" -Description "Super Admin Dashboard"

# Screenshot 3: User Management
Write-Host "`n3. Navigate to User Management page" -ForegroundColor Yellow
Write-Host "Press any key when User Management page is open..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Take-Screenshot -FilePath "$screenshotDir/user-management.png" -Description "User Management Interface"

# Screenshot 4: Add User Modal
Write-Host "`n4. Click 'Add User' button to open the modal" -ForegroundColor Yellow
Write-Host "Press any key when the Add User modal is open..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Take-Screenshot -FilePath "$screenshotDir/add-user.png" -Description "Add User Modal"

# Screenshot 5: Campaigns List
Write-Host "`n5. Close the modal and navigate to Campaigns page" -ForegroundColor Yellow
Write-Host "Press any key when Campaigns page is open..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Take-Screenshot -FilePath "$screenshotDir/campaigns-list.png" -Description "Campaigns List"

# Screenshot 6: Campaign Detail
Write-Host "`n6. Click on any campaign to view details" -ForegroundColor Yellow
Write-Host "Press any key when Campaign Detail page is open..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Take-Screenshot -FilePath "$screenshotDir/campaign-detail.png" -Description "Campaign Detail View"

# Screenshot 7: Weekly View
Write-Host "`n7. Navigate to Weekly View page" -ForegroundColor Yellow
Write-Host "Press any key when Weekly View page is open..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Take-Screenshot -FilePath "$screenshotDir/weekly-view.png" -Description "Weekly Planning View"

# Screenshot 8: Mobile View (requires manual browser resize)
Write-Host "`n8. Open Developer Tools (F12) and set to mobile view (iPhone/Samsung)" -ForegroundColor Yellow
Write-Host "Resize the view to mobile dimensions, then press any key..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Take-Screenshot -FilePath "$screenshotDir/mobile-view.png" -Description "Mobile Responsive View"

Write-Host "`n=== Screenshot Capture Complete! ===" -ForegroundColor Green
Write-Host "Screenshots saved in: $screenshotDir/" -ForegroundColor Cyan
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Review the captured screenshots" -ForegroundColor White
Write-Host "2. Run the update script to replace placeholders in README.md" -ForegroundColor White

# List captured files
Write-Host "`nCaptured files:" -ForegroundColor Cyan
Get-ChildItem $screenshotDir -Name | ForEach-Object { Write-Host "  $_" -ForegroundColor White }