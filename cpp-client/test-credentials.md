
# Test Credentials for C++ Client Authentication

## Account-Based Login (Email + Password)
- **Email**: testuser@example.com
- **Password**: Use the password you created when registering this account on the web app

## Session Code Login (6-digit codes)
- **Session Code 1**: 123456
  - Duration: 1 hour
  - Job Role: Software Engineer
  - Plan: Premium

- **Session Code 2**: 789012
  - Duration: 30 minutes  
  - Job Role: Product Manager
  - Plan: Basic

## Testing Instructions

### For Account Login:
1. Run the .exe file
2. Select option 1 (Account Login)
3. Enter email: testuser@example.com
4. Enter password: [your web app password]

### For Session Code Login:
1. Run the .exe file
2. Select option 2 (Quick Session)
3. Enter session code: 123456 or 789012

## Notes:
- Account users must have already registered on the web app with their email and password
- Session codes expire based on their duration (1 hour or 30 minutes)
- Timer starts when user clicks "Start" button
- All test data includes resume and job description documents for GPT context
