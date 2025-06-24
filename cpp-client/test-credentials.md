
# Test Credentials for C++ Client Authentication

## Account-Based Login (Email + OTP)
- **Email**: testuser@example.com
- **OTP**: 123456 (valid for 10 minutes from creation)

## Session Code Login (6-digit codes)
- **Session Code 1**: 123456
  - Duration: 1 hour
  - Job Role: Software Engineer
  - Plan: Standard

- **Session Code 2**: 789012
  - Duration: 30 minutes  
  - Job Role: Product Manager
  - Plan: Basic

## Testing Instructions

### For Account Login:
1. Run the .exe file
2. Select option 1 (Account Login)
3. Enter email: testuser@example.com
4. Enter OTP: 123456

### For Session Code Login:
1. Run the .exe file
2. Select option 2 (Quick Session)
3. Enter session code: 123456 or 789012

## Notes:
- The OTP expires 10 minutes after creation
- Session codes expire based on their duration (1 hour or 30 minutes)
- Timer starts when user clicks "Start" button
- All test data includes resume and job description documents for GPT context
