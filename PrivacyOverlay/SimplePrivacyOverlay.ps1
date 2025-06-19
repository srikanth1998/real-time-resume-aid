Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Add the DwmApi P/Invoke for screen sharing protection
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class DwmApi {
    [DllImport("dwmapi.dll")]
    public static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int value, int attrSize);
    
    // DWMWA_CLOAK = 13
    public const int DWMWA_CLOAK = 13;
}
"@

# Form setup
$form = New-Object System.Windows.Forms.Form
$form.Text = "Privacy Overlay"
$form.Size = New-Object System.Drawing.Size(400, 200)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
$form.TopMost = $true
$form.ShowInTaskbar = $false

# Make the form transparent (partially)
$form.Opacity = 0.75
$form.BackColor = [System.Drawing.Color]::FromArgb(30, 30, 150)

# Track if screen sharing protection is enabled
$script:isProtected = $false

# Add a visible border to make it clear this is an overlay
$borderPanel = New-Object System.Windows.Forms.Panel
$borderPanel.Dock = [System.Windows.Forms.DockStyle]::Fill
$borderPanel.Paint += {
    $graphics = $_.Graphics
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::Red, 2)
    $rect = New-Object System.Drawing.Rectangle(0, 0, $borderPanel.Width - 1, $borderPanel.Height - 1)
    $graphics.DrawRectangle($pen, $rect)
    $pen.Dispose()
}
$form.Controls.Add($borderPanel)

# Add label with instructions
$label = New-Object System.Windows.Forms.Label
$label.Text = "PRIVACY OVERLAY`r`nDrag to move`r`nRight-click for menu`r`nPress ESC to exit"
$label.TextAlign = [System.Drawing.ContentAlignment]::MiddleCenter
$label.ForeColor = [System.Drawing.Color]::White
$label.BackColor = [System.Drawing.Color]::Transparent
$label.Dock = [System.Windows.Forms.DockStyle]::Fill
$label.Font = New-Object System.Drawing.Font("Arial", 12, [System.Drawing.FontStyle]::Bold)
$borderPanel.Controls.Add($label)

# Create context menu
$contextMenu = New-Object System.Windows.Forms.ContextMenuStrip

# Create transparency menu
$transparencyMenu = New-Object System.Windows.Forms.ToolStripMenuItem
$transparencyMenu.Text = "Transparency"
$contextMenu.Items.Add($transparencyMenu)

# Add transparency options
$transparency25 = New-Object System.Windows.Forms.ToolStripMenuItem
$transparency25.Text = "25% Opacity"
$transparency25.Click += { $form.Opacity = 0.25 }
$transparencyMenu.DropDownItems.Add($transparency25)

$transparency50 = New-Object System.Windows.Forms.ToolStripMenuItem
$transparency50.Text = "50% Opacity"
$transparency50.Click += { $form.Opacity = 0.50 }
$transparencyMenu.DropDownItems.Add($transparency50)

$transparency75 = New-Object System.Windows.Forms.ToolStripMenuItem
$transparency75.Text = "75% Opacity"
$transparency75.Click += { $form.Opacity = 0.75 }
$transparencyMenu.DropDownItems.Add($transparency75)

$transparency90 = New-Object System.Windows.Forms.ToolStripMenuItem
$transparency90.Text = "90% Opacity"
$transparency90.Click += { $form.Opacity = 0.90 }
$transparencyMenu.DropDownItems.Add($transparency90)

# Create color menu
$colorMenu = New-Object System.Windows.Forms.ToolStripMenuItem
$colorMenu.Text = "Color"
$contextMenu.Items.Add($colorMenu)

# Add color options
$colorRed = New-Object System.Windows.Forms.ToolStripMenuItem
$colorRed.Text = "Red"
$colorRed.Click += { $form.BackColor = [System.Drawing.Color]::FromArgb(150, 30, 30) }
$colorMenu.DropDownItems.Add($colorRed)

$colorBlue = New-Object System.Windows.Forms.ToolStripMenuItem
$colorBlue.Text = "Blue"
$colorBlue.Click += { $form.BackColor = [System.Drawing.Color]::FromArgb(30, 30, 150) }
$colorMenu.DropDownItems.Add($colorBlue)

$colorGreen = New-Object System.Windows.Forms.ToolStripMenuItem
$colorGreen.Text = "Green"
$colorGreen.Click += { $form.BackColor = [System.Drawing.Color]::FromArgb(30, 150, 30) }
$colorMenu.DropDownItems.Add($colorGreen)

$colorBlack = New-Object System.Windows.Forms.ToolStripMenuItem
$colorBlack.Text = "Black"
$colorBlack.Click += { $form.BackColor = [System.Drawing.Color]::FromArgb(30, 30, 30) }
$colorMenu.DropDownItems.Add($colorBlack)

# Add screen sharing protection toggle
$protectionToggle = New-Object System.Windows.Forms.ToolStripMenuItem
$protectionToggle.Text = "Enable Screen Sharing Protection"
$protectionToggle.Click += {
    $script:isProtected = -not $script:isProtected
    
    if ($script:isProtected) {
        $protectionToggle.Text = "Disable Screen Sharing Protection"
        $value = 1
        $result = [DwmApi]::DwmSetWindowAttribute($form.Handle, [DwmApi]::DWMWA_CLOAK, [ref]$value, 4)
        $form.Text = "Privacy Overlay (Protected from Screen Capture)"
        $label.Text = "PRIVACY OVERLAY`r`nDrag to move`r`nRight-click for menu`r`nPress ESC to exit`r`n(PROTECTED FROM SCREEN CAPTURE)"
    } else {
        $protectionToggle.Text = "Enable Screen Sharing Protection"
        $value = 0
        $result = [DwmApi]::DwmSetWindowAttribute($form.Handle, [DwmApi]::DWMWA_CLOAK, [ref]$value, 4)
        $form.Text = "Privacy Overlay"
        $label.Text = "PRIVACY OVERLAY`r`nDrag to move`r`nRight-click for menu`r`nPress ESC to exit"
    }
}
$contextMenu.Items.Add($protectionToggle)

# Add separator
$separator = New-Object System.Windows.Forms.ToolStripSeparator
$contextMenu.Items.Add($separator)

# Add exit option
$exitItem = New-Object System.Windows.Forms.ToolStripMenuItem
$exitItem.Text = "Exit"
$exitItem.Click += { $form.Close() }
$contextMenu.Items.Add($exitItem)

# Assign context menu to form
$form.ContextMenuStrip = $contextMenu

# Enable dragging the form
$script:isDragging = $false
$script:dragStartPoint = New-Object System.Drawing.Point(0, 0)

$form.Add_MouseDown({
    if ($_.Button -eq [System.Windows.Forms.MouseButtons]::Left) {
        $script:isDragging = $true
        $script:dragStartPoint = New-Object System.Drawing.Point($_.X, $_.Y)
    }
})

$form.Add_MouseMove({
    if ($script:isDragging) {
        $newLocation = $form.Location
        $newLocation.X += $_.X - $script:dragStartPoint.X
        $newLocation.Y += $_.Y - $script:dragStartPoint.Y
        $form.Location = $newLocation
    }
})

$form.Add_MouseUp({
    if ($_.Button -eq [System.Windows.Forms.MouseButtons]::Left) {
        $script:isDragging = $false
    }
})

# Close on Escape key
$form.KeyPreview = $true
$form.Add_KeyDown({
    if ($_.KeyCode -eq [System.Windows.Forms.Keys]::Escape) {
        $form.Close()
    }
})

# Display form
[void]$form.ShowDialog()
