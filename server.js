import 'dotenv/config';
import express from 'express';
import OpenAI from 'openai';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import path from 'path';
import nodemailer from 'nodemailer';
import Stripe from 'stripe';


// Define __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const openai = new OpenAI();
const app = express();
const port = 3000;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
// Set Testing mode to true or false
const Testing = false;

app.use(bodyParser.json());
app.use(express.static('public'));

let userData = {}; // Temporary storage for user data

// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail', // Or use another email service
    auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASS  // Your email password
    }
});

// Email template function
const generateEmailHTML = (reading) => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Numerology Reading</title>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400..900&family=Quicksand:wght@300..700&display=swap" rel="stylesheet">
    <style>
        /* Global Reset */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background-color: #1a1a1a; color: #d4d4d4; padding: 20px; }
        .email-container { max-width: 600px; background-color: #1a1a1a; margin: 0 auto; padding: 20px; border-radius: 8px; overflow: hidden; }
        .header { text-align: center; }
        .header img { max-width: 100%; height: auto; border-radius: 8px 8px 0 0; }
        .title { color: #e0e0e0; margin: 20px 0 10px; font-family: 'Cinzel', serif; font-weight: 600; text-align: center; }
        h2 { margin:40px 10px; text-align: center; font-family: 'Cinzel', serif; font-weight: 500; line-height: 1; }
        .content { padding: 20px; font-size: 16px; line-height: 1.5; color: #d4d4d4; }
        .content p { margin-bottom: 15px; }
        .reading { background-color: #333333; padding: 15px; border-radius: 8px; color: #e0e0e0; line-height: 1.6; margin-top: 20px; }
        .footer { text-align: center; font-size: 12px; color: #a0a0a0; padding: 15px 10px; margin-top: 20px; border-top: 1px solid #444444; }
        #unsubscribe { margin-top: 5px; }
        @media (max-width: 480px) {
            .email-container { padding: 10px; }
            .title { font-size: 20px; }
            .content { font-size: 14px; }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <img src="https://general-watts.s3.us-east-2.amazonaws.com/numerology.jpg" alt="Numerology Insights">
        </div>
        <h1 class="title">Your Personalized Numerology Reading</h1>
        <div class="content">
            ${reading} <!-- Inserted reading content here -->
        </div>
        <div class="footer">
            <p>Thank you for choosing our service for your numerology reading. We are here to support you in every step of your journey.</p>
            <p>&copy; 2024 Watts Projects. All rights reserved.</p>
            <p id="unsubscribe"><a href="https://yourwebsite.com/unsubscribe" style="color: #d4d4d4; text-decoration: none;">Unsubscribe</a></p>
        </div>
    </div>
</body>
</html>`;
};

// Route to serve the main frontend form
app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

// Route to create a checkout session
app.post('/create-checkout-session', async (req, res) => {
    const { fullName, birthDate, email } = req.body;
    userData = { fullName, birthDate, email }; // Store user data temporarily

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'Personalized Numerology Reading',
                        },
                        unit_amount: 3590, // Set the price in cents (e.g., $20.00)
                    },
                    quantity: 1,
                },
            ],
            success_url: 'https://numerology-1zyl.onrender.com/success?session_id={CHECKOUT_SESSION_ID}', // Render URL
            cancel_url: 'https://numerology-1zyl.onrender.com/cancel', // Render URL
            customer_email: email,
        });

        res.json({ id: session.id }); // Return session ID to frontend
    } catch (error) {
        console.error("Error creating checkout session:", error);
        res.status(500).send("Failed to create checkout session.");
    }
});


// Route to handle successful payment or direct success for testing
app.get('/success', async (req, res) => {
    const session_id = req.query.session_id;

    if (session_id) {
        try {
            const session = await stripe.checkout.sessions.retrieve(session_id);

            if (session.payment_status === 'paid') {
                const { fullName, birthDate, email } = userData;

                // Generate numerology reading
                const completion = await openai.chat.completions.create({
                    model: "gpt-4",
                    messages: [
                        {
                            role: "user",
                            content: `Generate a detailed and comprehensive numerology reading for ${fullName} with the birth date ${birthDate}, exceeding 1200 words. Cover each key numerology aspect, including Life Path Number, Expression Number, Soul Urge Number, Personality Number, Birthday Number, Maturity Number, and a discussion of the individual’s current Pinnacle Cycle. Each section should provide insights into personality traits, life purpose, natural strengths, potential challenges, relationships, career tendencies, and personal growth. Include thoughtful advice for each number, guiding the person in embracing their unique qualities and overcoming challenges. 
                            Maintain a warm and insightful tone to encourage self-discovery, without mentioning any authors, books, or external sources. Format each section title with <h2></h2>. Wrap all <strong> tags with <br> tags on both sides, and use appropriate HTML tags for the rest of the content. 
                            Exclude <DOCTYPE html>, <html>, <head>, <meta>, <title>, and <body> tags.`
                        }
                    ],
                    max_tokens: 3000,
                });

                const reading = completion.choices[0].message.content;
                const emailHTML = generateEmailHTML(reading);

                // Send email
                await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: email,
                    subject: 'Your Personalized Numerology Reading',
                    html: emailHTML,
                });

                userData = null; // Clear user data after sending email
                res.sendFile(path.join(__dirname, 'public', 'success.html'));
            } else {
                res.send("Payment was not confirmed.");
            }
        } catch (error) {
            console.error("Error generating reading:", error);
            res.status(500).send("Failed to generate and send reading.");
        }
    } else {
        res.redirect('/');
    }
});


// Route to handle payment cancellation
app.get('/cancel', (req, res) => {
    res.send("Your payment was canceled. You can try again.");
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
