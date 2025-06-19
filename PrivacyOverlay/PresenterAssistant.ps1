Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Try to load DwmApi
Add-Type -TypeDefinition @"
    using System;
    using System.Runtime.InteropServices;
    
    public class DwmApi {
        [DllImport("dwmapi.dll")]
        public static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int attrValue, int attrSize);
    }
"@

# Form setup for the presenter assistant overlay
$form = New-Object System.Windows.Forms.Form
$form.Text = "Presenter Assistant"
$form.Size = New-Object System.Drawing.Size(500, 300)
$form.StartPosition = "Manual"
$form.Location = New-Object System.Drawing.Point(50, 50)
$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
$form.TopMost = $true
$form.ShowInTaskbar = $false

# Make the form semi-transparent
$form.Opacity = 0.85
$form.BackColor = [System.Drawing.Color]::FromArgb(30, 30, 50)

# Create a textbox for notes
$textBox = New-Object System.Windows.Forms.RichTextBox
$textBox.Multiline = $true
$textBox.Dock = [System.Windows.Forms.DockStyle]::Fill
$textBox.BackColor = [System.Drawing.Color]::FromArgb(30, 30, 50)
$textBox.ForeColor = [System.Drawing.Color]::White
$textBox.BorderStyle = [System.Windows.Forms.BorderStyle]::None
$textBox.Font = New-Object System.Drawing.Font("Arial", 12)
$textBox.Text = "YOUR PRESENTATION NOTES HERE:`r`n`r`n1. Key technical terms:`r`n   - Implementation strategy`r`n   - Resource allocation`r`n   - Performance metrics`r`n`r`n2. Important talking points:`r`n   - Project timeline and milestones`r`n   - Budget considerations`r`n   - Next steps after meeting`r`n`r`nPress F2 to toggle edit mode`r`nPress F3 to toggle visibility`r`nPress ESC to exit"
$form.Controls.Add($textBox)

# Initially make read-only
$textBox.ReadOnly = $true

# Try to set the window to be excluded from capture
try {
    $DWMWA_CLOAK = 13  # Window attribute for cloaking
    $cloakValue = 1     # 1 = Enable cloaking
    [DwmApi]::DwmSetWindowAttribute($form.Handle, $DWMWA_CLOAK, [ref]$cloakValue, 4)
    $statusLabel = New-Object System.Windows.Forms.Label
    $statusLabel.Text = "PRESENTER MODE: Overlay should be hidden from screen sharing"
    $statusLabel.Dock = [System.Windows.Forms.DockStyle]::Bottom
    $statusLabel.TextAlign = [System.Drawing.ContentAlignment]::MiddleCenter
    $statusLabel.ForeColor = [System.Drawing.Color]::Lime
    $statusLabel.Font = New-Object System.Drawing.Font("Arial", 8, [System.Drawing.FontStyle]::Bold)
    $statusLabel.Height = 20
    $form.Controls.Add($statusLabel)
}
catch {
    $statusLabel = New-Object System.Windows.Forms.Label
    $statusLabel.Text = "WARNING: Overlay might be visible during screen sharing"
    $statusLabel.Dock = [System.Windows.Forms.DockStyle]::Bottom
    $statusLabel.TextAlign = [System.Drawing.ContentAlignment]::MiddleCenter
    $statusLabel.ForeColor = [System.Drawing.Color]::Yellow
    $statusLabel.Font = New-Object System.Drawing.Font("Arial", 8, [System.Drawing.FontStyle]::Bold)
    $statusLabel.Height = 20
    $form.Controls.Add($statusLabel)
}

# Create drag bar
$dragBar = New-Object System.Windows.Forms.Panel
$dragBar.Height = 20
$dragBar.Dock = [System.Windows.Forms.DockStyle]::Top
$dragBar.BackColor = [System.Drawing.Color]::FromArgb(50, 50, 80)
$form.Controls.Add($dragBar)

# Add title to drag bar
$titleLabel = New-Object System.Windows.Forms.Label
$titleLabel.Text = "Presenter Assistant - Drag to move - F2:Edit F3:Hide ESC:Exit"
$titleLabel.Dock = [System.Windows.Forms.DockStyle]::Fill
$titleLabel.TextAlign = [System.Drawing.ContentAlignment]::MiddleLeft
$titleLabel.ForeColor = [System.Drawing.Color]::White
$titleLabel.Font = New-Object System.Drawing.Font("Arial", 8)
$dragBar.Controls.Add($titleLabel)

# Enable dragging the form by the drag bar
$isDragging = $false
$dragStartPoint = New-Object System.Drawing.Point(0, 0)

$dragBar.Add_MouseDown({
    if ($_.Button -eq [System.Windows.Forms.MouseButtons]::Left) {
        $script:isDragging = $true
        $script:dragStartPoint = New-Object System.Drawing.Point($_.X, $_.Y)
    }
})

$dragBar.Add_MouseMove({
    if ($script:isDragging) {
        $newLocation = $form.Location
        $newLocation.X += $_.X - $script:dragStartPoint.X
        $newLocation.Y += $_.Y - $script:dragStartPoint.Y
        $form.Location = $newLocation
    }
})

$dragBar.Add_MouseUp({
    if ($_.Button -eq [System.Windows.Forms.MouseButtons]::Left) {
        $script:isDragging = $false
    }
})

# Right-click context menu
$contextMenu = New-Object System.Windows.Forms.ContextMenuStrip

# Font size options
$fontSizeMenu = $contextMenu.Items.Add("Font Size")

$fontSize10 = New-Object System.Windows.Forms.ToolStripMenuItem
$fontSize10.Text = "Small (10pt)"
$fontSize10.Click += { $textBox.Font = New-Object System.Drawing.Font("Arial", 10) }
$fontSizeMenu.DropDownItems.Add($fontSize10)

$fontSize12 = New-Object System.Windows.Forms.ToolStripMenuItem
$fontSize12.Text = "Medium (12pt)"
$fontSize12.Click += { $textBox.Font = New-Object System.Drawing.Font("Arial", 12) }
$fontSizeMenu.DropDownItems.Add($fontSize12)

$fontSize14 = New-Object System.Windows.Forms.ToolStripMenuItem
$fontSize14.Text = "Large (14pt)"
$fontSize14.Click += { $textBox.Font = New-Object System.Drawing.Font("Arial", 14) }
$fontSizeMenu.DropDownItems.Add($fontSize14)

$fontSize16 = New-Object System.Windows.Forms.ToolStripMenuItem
$fontSize16.Text = "Extra Large (16pt)"
$fontSize16.Click += { $textBox.Font = New-Object System.Drawing.Font("Arial", 16) }
$fontSizeMenu.DropDownItems.Add($fontSize16)

# Opacity options
$opacityMenu = $contextMenu.Items.Add("Opacity")

$opacity50 = New-Object System.Windows.Forms.ToolStripMenuItem
$opacity50.Text = "50% Opacity"
$opacity50.Click += { $form.Opacity = 0.50 }
$opacityMenu.DropDownItems.Add($opacity50)

$opacity75 = New-Object System.Windows.Forms.ToolStripMenuItem
$opacity75.Text = "75% Opacity"
$opacity75.Click += { $form.Opacity = 0.75 }
$opacityMenu.DropDownItems.Add($opacity75)

$opacity85 = New-Object System.Windows.Forms.ToolStripMenuItem
$opacity85.Text = "85% Opacity"
$opacity85.Click += { $form.Opacity = 0.85 }
$opacityMenu.DropDownItems.Add($opacity85)

$opacity95 = New-Object System.Windows.Forms.ToolStripMenuItem
$opacity95.Text = "95% Opacity"
$opacity95.Click += { $form.Opacity = 0.95 }
$opacityMenu.DropDownItems.Add($opacity95)

# Background color options
$colorMenu = $contextMenu.Items.Add("Background Color")

$colorDarkBlue = New-Object System.Windows.Forms.ToolStripMenuItem
$colorDarkBlue.Text = "Dark Blue"
$colorDarkBlue.Click += { 
    $form.BackColor = [System.Drawing.Color]::FromArgb(30, 30, 50)
    $textBox.BackColor = [System.Drawing.Color]::FromArgb(30, 30, 50)
}
$colorMenu.DropDownItems.Add($colorDarkBlue)

$colorDarkGreen = New-Object System.Windows.Forms.ToolStripMenuItem
$colorDarkGreen.Text = "Dark Green"
$colorDarkGreen.Click += { 
    $form.BackColor = [System.Drawing.Color]::FromArgb(20, 40, 20)
    $textBox.BackColor = [System.Drawing.Color]::FromArgb(20, 40, 20)
}
$colorMenu.DropDownItems.Add($colorDarkGreen)

$colorDarkRed = New-Object System.Windows.Forms.ToolStripMenuItem
$colorDarkRed.Text = "Dark Red"
$colorDarkRed.Click += { 
    $form.BackColor = [System.Drawing.Color]::FromArgb(40, 20, 20)
    $textBox.BackColor = [System.Drawing.Color]::FromArgb(40, 20, 20)
}
$colorMenu.DropDownItems.Add($colorDarkRed)

$colorBlack = New-Object System.Windows.Forms.ToolStripMenuItem
$colorBlack.Text = "Dark Gray"
$colorBlack.Click += { 
    $form.BackColor = [System.Drawing.Color]::FromArgb(30, 30, 30)
    $textBox.BackColor = [System.Drawing.Color]::FromArgb(30, 30, 30)
}
$colorMenu.DropDownItems.Add($colorBlack)

# Toggle edit mode
$editMode = $contextMenu.Items.Add("Toggle Edit Mode")
$editMode.Click += {
    $textBox.ReadOnly = !$textBox.ReadOnly
    if ($textBox.ReadOnly) {
        $titleLabel.Text = "Presenter Assistant - Drag to move - F2:Edit F3:Hide ESC:Exit"
    } else {
        $titleLabel.Text = "EDIT MODE - F2 to return to view mode"
    }
}

# Add save and load options
$saveOption = $contextMenu.Items.Add("Save Notes")
$saveOption.Click += {
    $saveDialog = New-Object System.Windows.Forms.SaveFileDialog
    $saveDialog.Filter = "Text files (*.txt)|*.txt|All files (*.*)|*.*"
    $saveDialog.Title = "Save Presenter Notes"
    $saveDialog.DefaultExt = "txt"
    
    if ($saveDialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        [System.IO.File]::WriteAllText($saveDialog.FileName, $textBox.Text)
    }
}

$loadOption = $contextMenu.Items.Add("Load Notes")
$loadOption.Click += {
    $openDialog = New-Object System.Windows.Forms.OpenFileDialog
    $openDialog.Filter = "Text files (*.txt)|*.txt|All files (*.*)|*.*"
    $openDialog.Title = "Load Presenter Notes"
    
    if ($openDialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        $textBox.Text = [System.IO.File]::ReadAllText($openDialog.FileName)
    }
}

# Exit option
$contextMenu.Items.Add("Exit").Click += { $form.Close() }

# Assign context menu to form
$form.ContextMenuStrip = $contextMenu

# Toggle visibility hotkey (F3)
$visible = $true
$form.KeyPreview = $true
$form.Add_KeyDown({
    # F2 toggles edit mode
    if ($_.KeyCode -eq [System.Windows.Forms.Keys]::F2) {
        $textBox.ReadOnly = !$textBox.ReadOnly
        if ($textBox.ReadOnly) {
            $titleLabel.Text = "Presenter Assistant - Drag to move - F2:Edit F3:Hide ESC:Exit"
        } else {
            $titleLabel.Text = "EDIT MODE - F2 to return to view mode"
        }
    }
    # F3 toggles visibility
    elseif ($_.KeyCode -eq [System.Windows.Forms.Keys]::F3) {
        $script:visible = !$script:visible
        if ($script:visible) {
            $form.Opacity = 0.85
        } else {
            $form.Opacity = 0.1
        }
    }
    # ESC closes the application
    elseif ($_.KeyCode -eq [System.Windows.Forms.Keys]::Escape) {
        $form.Close()
    }
})

# Display form
$form.ShowDialog()
