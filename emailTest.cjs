const nodemailer = require('nodemailer');
require('dotenv/config'); // Load environment variables from .env

const transporter = nodemailer.createTransport({
    host: 'mail.privateemail.com',
    port: 465,
    secure: true, // true for port 465, false for 587
    auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASS  // Your email password
    }
});

const mailOptions = {
    from: process.env.EMAIL_USER,
    to: 'florian.blakaj0@gmail.com', // Replace with your email
    subject: 'Test Email',
    text: 'This is a test email to check SMTP configuration.'
};

transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
        console.error('Error sending email:', err);
    } else {
        console.log('Email sent successfully:', info.response);
    }
});
