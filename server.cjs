require('dotenv/config');
const express = require('express');
const OpenAI = require('openai');
const bodyParser = require('body-parser');
const { fileURLToPath } = require('url');
const path = require('path');
const nodemailer = require('nodemailer');
const Stripe = require('stripe');
const session = require('express-session');
const sqlite3 = require('sqlite3');
const http = require('http');



const db = new sqlite3.Database('./data/users.db', (err) => {
    if (err) {
        console.error("Error opening database:", err);
    } else {
        console.log("Connected to SQLite database");
    }
});

db.run(`CREATE TABLE IF NOT EXISTS user_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fullName TEXT NOT NULL,
    birthDate TEXT NOT NULL,
    entryDate TEXT NOT NULL
)`);



const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Set Testing mode to true or false
const Testing = false;

app.use(bodyParser.json());
app.use(express.static('public'));

app.use(session({
    secret: process.env.SESSION_SECRET || 'defaultSecret', // Use a secure, random secret in production
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set secure: true if using HTTPS
}));

// Middleware to protect the admin route
const adminAuth = (req, res, next) => {
    if (req.session && req.session.isAuthenticated) {
        next();
    } else {
        res.status(401).send('Unauthorized');
    }
};


// Route to display the login form
app.get('/admin-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'adminLogin.html'));
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    console.log("Username entered:", username);
    console.log("Password entered:", password);
    console.log("Env Username:", process.env.ADMIN_USER);
    console.log("Env Password:", process.env.ADMIN_PASS);

    if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
        req.session.isAuthenticated = true;
        res.status(200).send('Login successful');
    } else {
        res.status(401).send('Incorrect username or password');
    }
});

// Protect the admin dashboard route with the adminAuth middleware
app.get('/admin', adminAuth, (req, res) => {
    db.all(`SELECT * FROM user_data`, (err, rows) => {
        if (err) {
            console.error("Error fetching data:", err);
            res.status(500).send("Error retrieving data");
            return;
        }

        // Render data in a responsive HTML table
        let html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Admin Dashboard</title>
            <style>
                /* General styling */
                body { 
                    font-family: Arial, sans-serif; 
                    padding: 20px; 
                    background-color: #f7f7f7; 
                    color: #333; 
                    margin: 0;
                }
                h2 { 
                    text-align: center; 
                    color: #333; 
                    margin-bottom: 20px; 
                }

                /* Table styling */
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin-bottom: 20px; 
                }
                th, td { 
                    padding: 12px; 
                    border: 1px solid #ddd; 
                    text-align: left; 
                }
                th { 
                    background-color: #4CAF50; 
                    color: white; 
                }

                /* Responsive table styling */
                @media (max-width: 768px) {
                    table, thead, tbody, th, td, tr { 
                        display: block; 
                    }
                    th { 
                        display: none; 
                    }
                    td { 
                        display: flex; 
                        justify-content: space-between; 
                        padding: 10px;
                        border-bottom: 1px solid #ddd; 
                    }
                    td::before { 
                        content: attr(data-label); 
                        font-weight: bold; 
                        text-transform: uppercase;
                        color: #4CAF50;
                    }
                }
            </style>
        </head>
        <body>
            <h2>Admin Dashboard</h2>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Full Name</th>
                        <th>Birth Date</th>
                        <th>Entry Date</th>
                    </tr>
                </thead>
                <tbody>
        `;

        rows.forEach(row => {
            html += `
            <tr>
                <td data-label="ID">${row.id}</td>
                <td data-label="Full Name">${row.fullName}</td>
                <td data-label="Birth Date">${row.birthDate}</td>
                <td data-label="Entry Date">${row.entryDate}</td>
            </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        </body>
        </html>`;

        res.send(html);
    });
});


// Route to serve 'index.html' at '/home'
app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route to serve 'contactus.html' at '/contactus'
app.get('/contactus', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'contactus.html'));
});

// Route to serve 'contactus.html' at '/contactus'
app.get('/numerology', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'Numerology.html'));
});



let userData = {}; // Temporary storage for user data

/*
// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail', // Or use another email service
    auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASS  // Your email password
    }
});
*/

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
                        unit_amount: 1502, // Set the price in cents (e.g., $20.00)
                    },
                    quantity: 1,
                },
            ],
            success_url: 'https://novasynthesis.com/success?session_id={CHECKOUT_SESSION_ID}', // Render URL
            cancel_url: 'https://novasynthesis.com/', // Render URL
            customer_email: email,
        }); //http://localhost:3000/ https://numerology-1zyl.onrender.com/ https://novasynthesis.com/

        res.json({ id: session.id }); // Return session ID to frontend
    } catch (error) {
        console.error("Error creating checkout session:", error);
        res.status(500).send("Failed to create checkout session.");
    }
});

function calculateNumerologyNumbers(fullName, birthDate) {
    const lifePathNumber = calculateLifePath(birthDate);
    const expressionNumber = calculateExpression(fullName);
    const soulUrgeNumber = calculateSoulUrge(fullName);
    const personalityNumber = calculatePersonality(fullName);
    const birthdayNumber = new Date(birthDate).getDate();  // Day of birth as Birthday Number
    const maturityNumber = (lifePathNumber + expressionNumber) % 9 || 9; // Example for Maturity Number

    return { lifePathNumber, expressionNumber, soulUrgeNumber, personalityNumber, birthdayNumber, maturityNumber };
}

// Example functions (replace with actual logic)
function calculateLifePath(birthDate) {
    // Implement your Life Path calculation here
    return 8;  // Replace with calculated value
}

function calculateExpression(fullName) {
    // Implement your Expression Number calculation here
    return 4;  // Replace with calculated value
}

function calculateSoulUrge(fullName) {
    // Implement your Soul Urge Number calculation here
    return 5;  // Replace with calculated value
}

function calculatePersonality(fullName) {
    // Implement your Personality Number calculation here
    return 8;  // Replace with calculated value
}




app.get('/success', async (req, res) => {
    const session_id = req.query.session_id;

    if (session_id) {
        try {
            const session = await stripe.checkout.sessions.retrieve(session_id);

            if (session.payment_status === 'paid') {
                const { fullName, birthDate, email } = userData;

                // Calculate numerology numbers
                const { lifePathNumber, expressionNumber, soulUrgeNumber, personalityNumber, birthdayNumber, maturityNumber } = calculateNumerologyNumbers(fullName, birthDate);

                // Save data to the database
                const entryDate = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format
                db.run(`INSERT INTO user_data (fullName, birthDate, entryDate) VALUES (?, ?, ?)`, [fullName, birthDate, entryDate], (err) => {
                    if (err) {
                        console.error("Error saving user data to database:", err);
                    } else {
                        console.log("User data saved to database");
                    }
                });


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
            console.error("Something went wrong... ", error);
            res.status(500).send("Something went wrong...");
        }
    } else {
        res.redirect('/');
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


// Admin route to view user data
app.get('/admin', adminAuth, (req, res) => {
    db.all(`SELECT * FROM user_data`, (err, rows) => {
        if (err) {
            console.error("Error fetching data:", err);
            res.status(500).send("Error retrieving data");
            return;
        }

        // HTML for displaying the table
        let html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Admin Dashboard</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; background-color: #f7f7f7; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                table, th, td { border: 1px solid #ddd; padding: 8px; }
                th { background-color: #f2f2f2; }
            </style>
        </head>
        <body>
            <h2>Admin Dashboard</h2>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Full Name</th>
                        <th>Birth Date</th>
                        <th>Entry Date</th>
                    </tr>
                </thead>
                <tbody>
        `;

        rows.forEach(row => {
            html += `
            <tr>
                <td>${row.id}</td>
                <td>${row.fullName}</td>
                <td>${row.birthDate}</td>
                <td>${row.entryDate}</td>
            </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        </body>
        </html>`;

        res.send(html);
    });
});


// Route to handle payment cancellation
app.get('/cancel', (req, res) => {
    res.send("Your payment was canceled. You can try again.");
});
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});