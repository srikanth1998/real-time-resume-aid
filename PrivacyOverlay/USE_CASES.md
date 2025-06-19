# Privacy Overlay - Legitimate Use Cases

## Overview

The Privacy Overlay tool is designed for legitimate privacy protection during presentations, screen sharing, and demos. Below are specific examples of how this tool can be used responsibly.

## Example Scenarios

### 1. Protecting PII During Demonstrations

**Scenario:** A HR professional needs to demonstrate a payroll system but wants to hide employee SSNs and salary information.

**Solution:** Position the privacy overlay over the columns containing sensitive data while keeping the rest of the interface visible for the demonstration.

### 2. Masking Development Credentials

**Scenario:** A developer needs to share their screen to demonstrate an API integration but doesn't want to expose API keys or database credentials.

**Solution:** Place the privacy overlay over the configuration sections containing sensitive credentials while showing the code and functionality.

### 3. Healthcare Data Protection

**Scenario:** A medical professional needs to present patient cases but must comply with HIPAA regulations.

**Solution:** Use the privacy overlay to mask patient identifiers while sharing relevant medical information for educational purposes.

### 4. Financial Presentation Safety

**Scenario:** A financial advisor wants to demonstrate portfolio management software without exposing client account numbers.

**Solution:** Position overlays strategically to hide account numbers and personal details while showing performance metrics and allocation data.

## Best Practices

1. **Always indicate** that you're using a privacy tool to your audience
2. **Use contrasting colors** to make it clear that information is being deliberately masked
3. **Only mask the minimum necessary** information to maintain the value of your presentation
4. **Consider alternative methods** for sensitive demos (like using dummy data)

## Technical Implementation

The overlay achieves privacy through legitimate Windows APIs:
- `SetLayeredWindowAttributes`: Controls window transparency
- `WS_EX_TOPMOST`: Keeps the privacy mask above other windows
- No deceptive techniques that would hide the overlay from the audience

This overlay is designed to be clearly visible to both the presenter and the audience, with obvious visual indicators that a privacy tool is in use.
