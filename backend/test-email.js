// test-email.js
// Test Gmail SMTP configuration

const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmail() {
  console.log('Testing Gmail SMTP configuration...\n');
  
  console.log('Gmail User:', process.env.GMAIL_USER);
  console.log('App Password:', process.env.GMAIL_APP_PASSWORD ? '***configured***' : 'NOT SET');
  console.log('');

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'ChainLease'}" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER, // Send to yourself for testing
      subject: 'Test Email from ChainLease Backend',
      text: 'If you receive this email, Gmail SMTP is working correctly!',
      html: '<p>If you receive this email, <strong>Gmail SMTP is working correctly!</strong> ✅</p>',
    });

    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('\nCheck your inbox:', process.env.GMAIL_USER);
  } catch (error) {
    console.error('❌ Error sending email:');
    console.error(error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure GMAIL_USER and GMAIL_APP_PASSWORD are set in .env');
    console.error('2. Use an App Password, not your regular Gmail password');
    console.error('3. Enable 2FA on your Google account first');
    console.error('4. Generate App Password at: https://myaccount.google.com/apppasswords');
  }
}

testEmail();
