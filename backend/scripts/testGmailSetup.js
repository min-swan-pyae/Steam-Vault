// Test Gmail App Password setup
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testGmailSetup() {
  console.log('🧪 Testing Gmail App Password setup...');
  
  try {
    // Create transporter with App Password
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    // Verify connection
    console.log('🔌 Verifying Gmail connection...');
    await transporter.verify();
    console.log('✅ Gmail connection verified successfully!');

    // Send test email
    console.log('📧 Sending test email...');
    const info = await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: process.env.GMAIL_USER, // Send to self for testing
      subject: '🎮 Steam Vault - Email Test',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e3a8a;">🎮 Steam Vault Email Test</h2>
          <p>Congratulations! Your Gmail integration is working perfectly.</p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #059669; margin: 0;">✅ Setup Complete</h3>
            <p style="margin: 10px 0;">Your Steam Vault app can now send email notifications for:</p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>🔔 Price drop alerts</li>
              <li>📊 Market trend notifications</li>
              <li>🏆 Achievement updates</li>
              <li>💬 Forum activity</li>
            </ul>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            This test email was sent automatically to verify your Gmail App Password configuration.
          </p>
        </div>
      `
    });

    console.log('✅ Test email sent successfully!');
    console.log(`📬 Message ID: ${info.messageId}`);
    console.log('🎉 Gmail setup is complete and working!');
    
  } catch (error) {
    console.error('❌ Gmail setup test failed:', error.message);
    
    if (error.code === 'EAUTH') {
      console.log('\n🔧 Authentication Error - Check these:');
      console.log('• GMAIL_USER is correct');
      console.log('• GMAIL_APP_PASSWORD is the 16-character app password');
      console.log('• 2-Factor Authentication is enabled on your Gmail account');
    }
  }
}

// Run the test
testGmailSetup();