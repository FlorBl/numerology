require('dotenv/config');
const express = require('express');
const { OpenAI } = require('openai');
const bodyParser = require('body-parser');
const path = require('path');
const nodemailer = require('nodemailer');
const Stripe = require('stripe');

// Initialize Stripe with secret key
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // Make sure the environment variable is set
});

// Initialize Express app
const app = express();

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
    host: 'mail.privateemail.com',
    port: 465, // Use 587 for TLS
    secure: true, // true for port 465, false for 587
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
            <p id="unsubscribe"><a href="" style="color: #d4d4d4; text-decoration: none;">Unsubscribe</a></p>
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

    // Validate input data
    if (!fullName || !birthDate || !email) {
        return res.status(400).send("All fields (fullName, birthDate, email) are required.");
    }

    try {
        const successURL = process.env.SUCCESS_URL || 'http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}';
        const cancelURL = process.env.CANCEL_URL || 'http://localhost:3000/';

        // Create checkout session with metadata
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
                        unit_amount: 1502, // Set price in cents
                    },
                    quantity: 1,
                },
            ],
            success_url: successURL,
            cancel_url: cancelURL,
            customer_email: email,
            metadata: {
                fullName,
                birthDate,
            },
        });

        res.json({ id: session.id }); // Return session ID to frontend
    } catch (error) {
        console.error("Stripe error:", error.message);
        res.status(500).send("Failed to create checkout session.");
    }
});




function calculateNumerologyNumbers(fullName, birthDate) {
    const lifePathNumber = calculateLifePath(birthDate);
    const expressionNumber = calculateExpression(fullName);
    const soulUrgeNumber = calculateSoulUrge(fullName);
    const personalityNumber = calculatePersonality(fullName);
    const birthdayNumber = getBirthdayNumber(birthDate);
    const maturityNumber = calculateMaturityNumber(lifePathNumber, expressionNumber);

    return { lifePathNumber, expressionNumber, soulUrgeNumber, personalityNumber, birthdayNumber, maturityNumber };
}

function calculateLifePath(birthDate) {
    return reduceToSingleDigit(sumDigits(birthDate.replace(/-/g, '')));
}

function calculateExpression(fullName) {
    return reduceToSingleDigit(sumDigits(convertLettersToNumbers(fullName)));
}

function calculateSoulUrge(fullName) {
    const vowels = fullName.match(/[aeiou]/gi) || [];
    return reduceToSingleDigit(sumDigits(convertLettersToNumbers(vowels.join(''))));
}

function calculatePersonality(fullName) {
    const consonants = fullName.match(/[^aeiou\s]/gi) || [];
    return reduceToSingleDigit(sumDigits(convertLettersToNumbers(consonants.join(''))));
}

function getBirthdayNumber(birthDate) {
    const day = new Date(birthDate).getDate();
    return reduceToSingleDigit(day);
}

function calculateMaturityNumber(lifePathNumber, expressionNumber) {
    return reduceToSingleDigit(lifePathNumber + expressionNumber);
}

function sumDigits(input) {
    return input.split('').reduce((sum, char) => sum + parseInt(char, 10), 0);
}

function reduceToSingleDigit(num) {
    while (num > 9 && num !== 11 && num !== 22 && num !== 33) {
        num = sumDigits(num.toString());
    }
    return num;
}

function convertLettersToNumbers(input) {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    return input
        .toLowerCase()
        .split('')
        .map(char => alphabet.indexOf(char) + 1 || 0)
        .join('');
}



app.get('/success', async (req, res) => {
    const session_id = req.query.session_id;

    if (!session_id) {
        return res.redirect('/');
    }

    try {
        const session = await stripe.checkout.sessions.retrieve(session_id);

        if (session.payment_status === 'paid') {
            const { fullName, birthDate } = session.metadata;
            const userEmail = session.customer_email;

            // Calculate numerology numbers
            const { lifePathNumber, expressionNumber, soulUrgeNumber, personalityNumber, birthdayNumber, maturityNumber } =
                calculateNumerologyNumbers(fullName, birthDate);

            // Generate personalized numerology reading
            const completion = await openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "user",
                        content: `Generate a highly detailed and personalized numerology reading that is at least 1000 words long for ${fullName}, born on ${birthDate}. The Life Path Number is ${lifePathNumber}, the Expression Number is ${expressionNumber}, the Soul Urge Number is ${soulUrgeNumber}, the Personality Number is ${personalityNumber}, the Birthday Number is ${birthdayNumber}, and the Maturity Number is ${maturityNumber}.
                        
                        Each numerology aspect should have its own distinct title section, formatted in <h2> tags, followed by an in-depth description. Each section should provide:
                        1. A deep explanation of the meaning and significance of the number.
                        2. Personalized insights into how this number influences ${fullName}'s personality traits, life purpose, strengths, challenges, and decision-making.
                        3. Practical advice on how ${fullName} can harness the strengths of this number and overcome challenges.
                        4. Relationship insights, including how this number affects interpersonal dynamics.
                        5. Career tendencies and how this number aligns with or supports professional aspirations.
                        6. Personal growth opportunities and specific actions ${fullName} can take to live in alignment with their numerology.

                        Additionally, include:
                        - **Reflection Questions**: Provide 1-2 questions at the end of each section to encourage deeper self-awareness and introspection.
                        - **Actionable Advice**: Offer specific steps ${fullName} can take to align their life with the energies of each number.
                        - **Compatibility Notes**: Include insights on how each number influences relationships and interactions with others.

                        Make the descriptions encouraging and empowering, and use mystical and poetic language where appropriate to inspire a sense of wonder and connection. Use HTML formatting but exclude <DOCTYPE html>, <html>, <head>, <meta>, <title>, and <body> tags to focus purely on the content.

                        End with a brief summary and motivational note for ${fullName}, tying all the insights together to inspire self-discovery and growth.`
                    }
                ],
                max_tokens: 3000,
            });

            const reading = completion.choices[0].message.content;
            const emailHTML = generateEmailHTML(reading);

            // Send the numerology reading to the user
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: userEmail, // User's email
                subject: 'Your Personalized Numerology Reading',
                html: emailHTML,
            });

            console.log(`Reading sent successfully to the user: ${userEmail}`);

            // Send an additional email to yourself with the user's details
            const adminEmailHTML = `
                <p><strong>New Numerology Reading Purchase</strong></p>
                <p><strong>Full Name:</strong> ${fullName}</p>
                <p><strong>Email:</strong> ${userEmail}</p>
                <p><strong>Numerology Values:</strong></p>

            `;

            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: process.env.EMAIL_USER, // Your email
                subject: 'New Numerology Reading Purchase',
                html: adminEmailHTML,
            });

            console.log("Notification email sent to admin.");

            res.sendFile(path.join(__dirname, 'public', 'success.html'));
        } else {
            res.send("Payment was not confirmed.");
        }
    } catch (error) {
        console.error("Error in success route:", error.message);
        res.status(500).send("Something went wrong...");
    }
});


// Route to handle contact form submission
app.post('/contact', async (req, res) => {
    const { name, email, subject, message } = req.body;

    // Email content
    const mailOptions = {
        from: process.env.EMAIL_USER, // Sender email
        to: process.env.EMAIL_USER, // Your email where you want to receive messages
        subject: `Contact Form Submission: ${subject}`,
        text: `From: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: "Message sent successfully!" });
    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).json({ message: "Failed to send message." });
    }
});


// Route to handle payment cancellation
app.get('/cancel', (req, res) => {
    res.send("Your payment was canceled. You can try again.");
});
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});