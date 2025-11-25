// Email Connection API routes
import express from 'express';
import firebaseService from '../services/firebaseService.js';
import crypto from 'crypto';

const router = express.Router();

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  if (!req.user || !req.user.steamId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Connect email to Steam account
router.post('/connect-email', requireAuth, async (req, res) => {
  try {
    const { email } = req.body;
    const steamId = req.user.steamId;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email address required' });
    }

    // Check if email is already connected to another account
    const existingConnection = await firebaseService.emailConnections
      .where('email', '==', email)
      .where('isVerified', '==', true)
      .get();

    if (!existingConnection.empty) {
      return res.status(400).json({ error: 'Email already connected to another Steam account' });
    }

    // Generate verification token
    const verificationToken = crypto.randomUUID();
    
    // Create email connection
    const connection = await firebaseService.connectEmail(steamId, email, verificationToken);

  // Resolve a public base URL for the verification link (avoid localhost in emails)
  const forwardedProto = req.get('x-forwarded-proto');
  const forwardedHost = req.get('x-forwarded-host');
  const hostUrl = forwardedHost ? `${forwardedProto || req.protocol}://${forwardedHost}` : `${req.protocol}://${req.get('host')}`;
  const backendPublicUrl = process.env.BACKEND_PUBLIC_URL || process.env.PUBLIC_BASE_URL || process.env.BASE_URL || hostUrl;

  // Send verification email
  await firebaseService.emailTransporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: '🎮 Steam Vault - Verify Your Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e3a8a;">🎮 Steam Vault Email Verification</h2>
          <p>Hi ${req.user.displayName || 'Steam User'},</p>
          <p>Please verify your email address to receive Steam Vault notifications:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${backendPublicUrl}/api/email/verify?token=${verificationToken}&steamId=${steamId}" 
               style="background: #1e3a8a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">
              ✅ Verify Email
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            Or copy this link: ${backendPublicUrl}/api/email/verify?token=${verificationToken}&steamId=${steamId}
          </p>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #059669; margin: 0;">🔔 What you'll receive:</h3>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>💰 Price drop alerts for Steam items</li>
              <li>💬 Forum activity updates</li>
              <li>📊 System announcements</li>
              <li>⚡ Real-time notifications</li>
            </ul>
          </div>
          
          <p style="color: #6b7280; font-size: 12px;">
            This email was sent because you requested to connect this email to your Steam account on Steam Vault.
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      `
    });

    res.json({ 
      success: true, 
      message: 'Verification email sent. Please check your inbox.' 
    });

  } catch (error) {
    console.error('Email connection error:', error);
    res.status(500).json({ error: 'Failed to connect email' });
  }
});

// Verify email token
router.get('/verify', async (req, res) => {
  try {
    const { token, steamId } = req.query;

    if (!token || !steamId) {
      return res.status(400).send(`
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: #dc2626;">❌ Invalid Verification Link</h2>
          <p>The verification link is invalid or incomplete.</p>
        </div>
      `);
    }

    // Verify the token
    const result = await firebaseService.verifyEmail(steamId, token);

    if (result.success) {
      const frontendUrl = process.env.FRONTEND_URL || process.env.PUBLIC_FRONTEND_URL || process.env.APP_URL || 'http://localhost:5173';
      res.send(`
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: #059669;">✅ Email Verified Successfully!</h2>
          <p>Your email has been connected to your Steam Vault account.</p>
          <p>You'll now receive notifications for price drops, forum activity, and system updates!</p>
          <a href="${frontendUrl}" style="background: #1e3a8a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 20px;">
            🎮 Return to Steam Vault
          </a>
        </div>
      `);
    } else {
      res.status(400).send(`
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: #dc2626;">❌ Verification Failed</h2>
          <p>${result.error || 'Invalid or expired verification token.'}</p>
        </div>
      `);
    }

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).send(`
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h2 style="color: #dc2626;">❌ Verification Error</h2>
        <p>An error occurred during email verification. Please try again.</p>
      </div>
    `);
  }
});

// Get user's email connection status
router.get('/status', requireAuth, async (req, res) => {
  try {
    const steamId = req.user.steamId;
    const emailConnection = await firebaseService.getUserEmail(steamId);
    
    res.json({
      hasEmail: !!emailConnection,
      email: emailConnection?.email || null,
      isVerified: emailConnection?.isVerified || false
    });

  } catch (error) {
    console.error('Email status check error:', error);
    res.status(500).json({ error: 'Failed to check email status' });
  }
});

// Disconnect email
router.delete('/disconnect', requireAuth, async (req, res) => {
  try {
    const steamId = req.user.steamId;
    
    // Remove email connection
    const connectionQuery = await firebaseService.emailConnections
      .where('steamId', '==', steamId)
      .get();

    const batch = firebaseService.db.batch();
    connectionQuery.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    res.json({ success: true, message: 'Email disconnected successfully' });

  } catch (error) {
    console.error('Email disconnect error:', error);
    res.status(500).json({ error: 'Failed to disconnect email' });
  }
});

export default router;