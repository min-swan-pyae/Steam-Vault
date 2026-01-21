import { google } from 'googleapis';
import readline from 'readline';

// Your OAuth2 credentials from Google Cloud Console
const CLIENT_ID = '31301385270-trb19kn6fc51h803d30p1385j875r8c3.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'http://localhost:8080'; // Local redirect URI

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Generate the URL for user authorization
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline', // Important: This ensures we get a refresh token
  scope: ['https://www.googleapis.com/auth/gmail.send'],
  prompt: 'consent' // Forces consent screen to get refresh token
});

console.log('🔗 Open this URL in your browser to authorize Gmail access:');
console.log(authUrl);
console.log('\n⚠️  IMPORTANT: After authorization, you\'ll be redirected to http://localhost:8080');
console.log('📋 Copy the ENTIRE URL from your browser\'s address bar and paste it below.');
console.log('    Example: http://localhost:8080/?code=XXXXXX&scope=...');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('📝 Paste the full redirect URL here: ', async (redirectUrl) => {
  try {
    // Extract the authorization code from the URL
    const url = new URL(redirectUrl);
    const code = url.searchParams.get('code');
    
    if (!code) {
      console.error('❌ No authorization code found in the URL. Please make sure you pasted the complete URL.');
      rl.close();
      return;
    }

    const { tokens } = await oauth2Client.getToken(code);
    
    console.log('\n✅ Success! Your Gmail API credentials:');
    console.log('GMAIL_USER=badboyminato123@gmail.com');
    console.log(`GMAIL_CLIENT_ID=${CLIENT_ID}`);
    console.log(`GMAIL_CLIENT_SECRET=${CLIENT_SECRET}`);
    console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
    
    console.log('\n📋 Add these to your backend/.env file!');
    
  } catch (error) {
    console.error('❌ Error getting tokens:', error);
  }
  rl.close();
});