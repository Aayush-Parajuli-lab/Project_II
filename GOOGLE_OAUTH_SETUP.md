# Google OAuth Setup Guide for StockVision Pro

This guide will help you set up Google OAuth authentication for StockVision Pro.

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" and then "New Project"
3. Enter a project name (e.g., "StockVision Pro")
4. Click "Create"

## Step 2: Enable Google+ API

1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google+ API" or "Google Identity"
3. Click on "Google+ API" and click "Enable"

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" and click "Create"
3. Fill in the required information:
   - **App name**: StockVision Pro
   - **User support email**: Your email
   - **Developer contact information**: Your email
4. Click "Save and Continue"
5. On the Scopes page, click "Save and Continue"
6. On the Test users page, add your email and click "Save and Continue"
7. Review and click "Back to Dashboard"

## Step 4: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Enter a name (e.g., "StockVision Pro Web Client")
5. Add Authorized JavaScript origins:
   - `http://localhost:3000`
   - `http://127.0.0.1:3000`
6. Add Authorized redirect URIs:
   - `http://localhost:8081/api/auth/google/callback`
   - `http://127.0.0.1:8081/api/auth/google/callback`
7. Click "Create"

## Step 5: Get Your Credentials

1. After creating the OAuth client, you'll see a popup with your credentials
2. Copy the **Client ID** and **Client Secret**
3. You can also find these later in the Credentials page

## Step 6: Configure Your Application

1. Copy `backend/.env.example` to `backend/.env`
2. Add your Google OAuth credentials:
   ```env
   GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret-here
   ```
3. Set other required environment variables:
   ```env
   JWT_SECRET=your-super-secret-jwt-key-here
   SESSION_SECRET=your-session-secret-key-here
   DB_PASSWORD=your_database_password
   ```

## Step 7: Test the Setup

1. Start your backend server: `cd backend && npm start`
2. Start your frontend: `cd frontend && npm start`
3. Go to `http://localhost:3000/auth`
4. Click "Continue with Google"
5. You should be redirected to Google's OAuth consent screen

## Troubleshooting

### Common Issues

**Error: "This app isn't verified"**
- This is normal for development. Click "Advanced" and then "Go to StockVision Pro (unsafe)"
- For production, you'll need to verify your app

**Error: "redirect_uri_mismatch"**
- Make sure your redirect URIs in Google Cloud Console match exactly
- Check that you're using the correct ports (3000 for frontend, 8081 for backend)

**Error: "Access blocked: This app's request is invalid"**
- Ensure your OAuth consent screen is properly configured
- Check that the Google+ API is enabled

### Production Setup

For production deployment:

1. Update your OAuth credentials with your production domains
2. Add production URLs to Authorized JavaScript origins and redirect URIs
3. Submit your app for verification if needed
4. Use HTTPS for all OAuth redirects

## Environment Variables Reference

```env
# Required for Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Required for JWT authentication
JWT_SECRET=your-jwt-secret-minimum-32-characters
SESSION_SECRET=your-session-secret-key

# Database (required)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_db_password
DB_NAME=stock_prediction

# Optional - Ninja API key (leave blank or add your key)
NINJA_API_KEY=
```

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use strong, unique secrets** for JWT and session keys
3. **Rotate credentials regularly** in production
4. **Use HTTPS** in production environments
5. **Limit OAuth scopes** to only what's needed (profile, email)
6. **Validate tokens** on the backend for every protected route

## Need Help?

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Passport.js Google Strategy](http://www.passportjs.org/packages/passport-google-oauth20/)