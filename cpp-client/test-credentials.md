
# Test Credentials for C++ Client Authentication

## Creating Test Account (Required for Account Login)

### Step 1: Create Account on Web App
1. Go to your web application: https://your-app-url.lovable.app
2. Click "Sign In" or navigate to `/auth`
3. Select "Create Account" or "Sign Up"
4. Enter the following details:
   - **Email**: testuser@example.com
   - **Password**: testpass123
5. Complete the registration process
6. Verify email if required

### Step 2: Test Account Details
Once created, you can use these credentials:
- **Email**: testuser@example.com
- **Password**: testpass123

## Session Code Login (No Account Required)
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
1. First create the account using Step 1 above
2. Run the .exe file
3. Select option 1 (Account Login)
4. Enter email: testuser@example.com
5. Enter password: testpass123

### For Session Code Login:
1. Run the .exe file
2. Select option 2 (Quick Session)
3. Enter session code: 123456 or 789012

## Notes:
- Account users must have already registered on the web app with their email and password
- Session codes expire based on their duration (1 hour or 30 minutes)
- Timer starts when user clicks "Start" button
- All test data includes resume and job description documents for GPT context
- Use session codes for quick testing without account creation
- Use account login to test the full authentication flow

## Troubleshooting:
- If account login fails, make sure you created the account on the web app first
- If session codes don't work, check that the test data has been loaded in the database
- Session codes are case-sensitive and must be exactly 6 digits
