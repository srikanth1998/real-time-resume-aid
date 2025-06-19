# Enhanced Privacy Overlay

A robust privacy overlay application for Windows with screen capture protection, audio monitoring, and screen capture capabilities.

This application demonstrates a legitimate use of transparent window overlays for privacy and information protection purposes. The overlay has **clear visual indicators** that it's active, making it obvious to both the user and anyone viewing their screen that a privacy tool is in use.

## Key Features

- **Screen Sharing Protection**: Guaranteed invisibility during screen sharing/recording using Windows DWM API (DWMWA_CLOAK)
- **Audio Monitoring**: Real-time audio level visualization with adjustable settings
- **Screen Capture**: Capture your entire screen with one click and view the preview
- **Customizable Overlay**: Change color, opacity, position, and size as needed
- **User-Friendly Controls**: Intuitive control panel with easy-to-use buttons and sliders
- **Always-on-Top**: Overlay stays on top of other windows for continuous privacy protection
- **Drag & Resize**: Move and resize the overlay with simple mouse actions
- **Context Menu**: Right-click the overlay for quick access to common options

## Legitimate Use Cases

This tool is designed for scenarios such as:

1. **Protecting Personally Identifiable Information (PII)** - Cover sensitive data during demos or presentations
2. **Masking Confidential Information** - Hide proprietary information when sharing your screen
3. **Focus Management** - Create a visual mask over distracting elements during presentations
4. **Assistive Technology** - Provide visual guides or highlights for presenters

## Features

- Fully visible with clear borders and text indicators
- Adjustable transparency levels (25%, 50%, 75%, 90%)
- Multiple color options
- Resizable and draggable interface
- Always-on-top functionality
- Right-click menu for easy configuration

## Responsible Usage Guidelines

This tool is intended for legitimate privacy protection and is deliberately designed to be visible on screen. It is NOT intended for:

- Cheating during online exams
- Deceiving viewers during screen sharing
- Any unethical or deceptive purposes

## How to Use

1. Compile the application using the provided build script
2. Run the executable `PrivacyOverlay.exe`
3. Use the control panel to manage overlay settings:
   - Toggle the overlay visibility with "Toggle Overlay"
   - Enable/disable screen share protection with "Toggle Protection"
   - Start/stop audio monitoring to visualize audio levels
   - Capture the screen with "Capture Screen"
   - Adjust opacity with the slider
   - Select a color from the color buttons
4. Interact with the overlay window:
   - Drag it to position it over sensitive information
   - Resize by dragging the corner handles
   - Right-click for additional settings via context menu
   - Look for the green indicator dot when protection is enabled

## Building the Application

### Prerequisites

- Windows 10 or 11
- Visual Studio with C++ desktop development workload

### Using the Build Script

Simply run the included build script:

```
build.bat
```

The executable will be created in the `build` directory.

### Manual Build Command

If you prefer to build manually:

```
cl /EHsc /std:c++17 /O2 EnhancedPrivacyOverlay.cpp OverlayWindow.cpp ControlPanel.cpp /link user32.lib gdi32.lib comctl32.lib dwmapi.lib ole32.lib gdiplus.lib /out:PrivacyOverlay.exe
```

## Technical Details

This application uses Windows APIs:
- `CreateWindowEx` with `WS_EX_LAYERED` for window transparency
- `SetLayeredWindowAttributes` for controlling transparency level
- Standard Windows message handling for drag, resize, and UI interactions
- The screen sharing protection feature uses the Windows DWM API `DwmSetWindowAttribute` function with the `DWMWA_CLOAK` attribute, which prevents the window from being included in screen captures.
