// Simple Gmail setup using App Passwords (no OAuth required)
// This bypasses the complex OAuth verification process

console.log('🔧 Setting up Gmail with App Password (Simple Method)');
console.log('='.repeat(60));
console.log();

console.log('📋 Step-by-Step Instructions:');
console.log();

console.log('1️⃣ Enable 2-Factor Authentication on your Gmail account:');
console.log('   • Go to: https://myaccount.google.com/security');
console.log('   • Enable "2-Step Verification" if not already enabled');
console.log();

console.log('2️⃣ Generate an App Password:');
console.log('   • Go to: https://myaccount.google.com/apppasswords');
console.log('   • Select "Mail" as the app');
console.log('   • Select "Other (custom name)" as the device');
console.log('   • Enter name: "Steam Vault Notifications"');
console.log('   • Copy the generated 16-character app password');
console.log();

console.log('3️⃣ Add these to your backend/.env file:');
console.log('   GMAIL_USER=badboyminato123@gmail.com');
console.log('   GMAIL_APP_PASSWORD=your_16_character_app_password');
console.log();

console.log('✅ This method is much simpler and doesn\'t require:');
console.log('   • OAuth consent screen verification');
console.log('   • Google app verification process');
console.log('   • Refresh tokens or complex authentication');
console.log();

console.log('🚀 Once configured, your email notifications will work immediately!');