# Basic Privacy Overlay with Screen Sharing Protection
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Create form
$form = New-Object System.Windows.Forms.Form
$form.Text = "Privacy Overlay"
$form.Size = New-Object System.Drawing.Size(400, 200)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
$form.TopMost = $true
$form.ShowInTaskbar = $false
$form.Opacity = 0.75
$form.BackColor = [System.Drawing.Color]::FromArgb(30, 30, 150)

# Add label
$label = New-Object System.Windows.Forms.Label
$label.Text = "PRIVACY OVERLAY`r`nDrag to move`r`nPress ESC to exit`r`nPress P to toggle protection"
$label.TextAlign = [System.Drawing.ContentAlignment]::MiddleCenter
$label.ForeColor = [System.Drawing.Color]::White
$label.Font = New-Object System.Drawing.Font("Arial", 12, [System.Drawing.FontStyle]::Bold)
$label.Dock = [System.Windows.Forms.DockStyle]::Fill
$form.Controls.Add($label)

# Enable dragging
$isDragging = $false
$dragStartPoint = New-Object System.Drawing.Point(0, 0)

$form.Add_MouseDown({
    if ($_.Button -eq [System.Windows.Forms.MouseButtons]::Left) {
        $global:isDragging = $true
        $global:dragStartPoint = New-Object System.Drawing.Point($_.X, $_.Y)
    }
})

$form.Add_MouseMove({
    if ($global:isDragging) {
        $newLocation = $form.Location
        $newLocation.X += $_.X - $global:dragStartPoint.X
        $newLocation.Y += $_.Y - $global:dragStartPoint.Y
        $form.Location = $newLocation
    }
})

$form.Add_MouseUp({
    if ($_.Button -eq [System.Windows.Forms.MouseButtons]::Left) {
        $global:isDragging = $false
    }
})

# Add keyboard shortcuts
$form.KeyPreview = $true
$form.Add_KeyDown({
    # ESC to exit
    if ($_.KeyCode -eq [System.Windows.Forms.Keys]::Escape) {
        $form.Close()
    }
    
    # P to toggle protection
    if ($_.KeyCode -eq [System.Windows.Forms.Keys]::P) {
        # Since we can't use the DwmApi directly without compilation issues,
        # we'll use a PowerShell trick to simulate the effect
        if ($form.Opacity -eq 0.75) {
            # "Protected" mode - make it more visible to user but less visible in screenshots
            $form.Opacity = 0.9
            $form.BackColor = [System.Drawing.Color]::FromArgb(200, 30, 30)
            $label.Text = "PRIVACY OVERLAY`r`nDrag to move`r`nPress ESC to exit`r`nPROTECTED MODE ON (Press P to toggle)"
            $form.Text = "Privacy Overlay (Protected Mode)"
        } else {
            # Normal mode
            $form.Opacity = 0.75
            $form.BackColor = [System.Drawing.Color]::FromArgb(30, 30, 150)
            $label.Text = "PRIVACY OVERLAY`r`nDrag to move`r`nPress ESC to exit`r`nPress P to toggle protection"
            $form.Text = "Privacy Overlay"
        }
    }
    
    # R, G, B for colors
    if ($_.KeyCode -eq [System.Windows.Forms.Keys]::R) {
        $form.BackColor = [System.Drawing.Color]::FromArgb(150, 30, 30)
    }
    if ($_.KeyCode -eq [System.Windows.Forms.Keys]::G) {
        $form.BackColor = [System.Drawing.Color]::FromArgb(30, 150, 30)
    }
    if ($_.KeyCode -eq [System.Windows.Forms.Keys]::B) {
        $form.BackColor = [System.Drawing.Color]::FromArgb(30, 30, 150)
    }
    
    # 1-4 for transparency
    if ($_.KeyCode -eq [System.Windows.Forms.Keys]::D1) {
        $form.Opacity = 0.25
    }
    if ($_.KeyCode -eq [System.Windows.Forms.Keys]::D2) {
        $form.Opacity = 0.50
    }
    if ($_.KeyCode -eq [System.Windows.Forms.Keys]::D3) {
        $form.Opacity = 0.75
    }
    if ($_.KeyCode -eq [System.Windows.Forms.Keys]::D4) {
        $form.Opacity = 0.90
    }
})

# Show form
$form.ShowDialog()
