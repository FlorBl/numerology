require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = 3000;

// Set Testing mode to true or false
const Testing = true;

app.use(bodyParser.json());
app.use(express.static('public'));

let userData = {}; // Temporary storage for user data

app.post('/create-checkout-session', async (req, res) => {
    const { fullName, birthDate, email } = req.body;
    
    // Store user data temporarily
    userData = { fullName, birthDate, email };

    if (Testing) {
        // Simulate successful payment session creation for testing
        return res.json({ testingRedirect: '/success' });
    } else {
        // Normal payment processing
        try {
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'Numerology Reading',
                        },
                        unit_amount: 5000, // Amount in cents ($50)
                    },
                    quantity: 1,
                }],
                mode: 'payment',
                success_url: `http://localhost:${port}/success`,
                cancel_url: `http://localhost:${port}/cancel`,
            });

            res.json({ id: session.id });
        } catch (error) {
            console.error("Error creating checkout session:", error);
            res.status(500).json({ error: "Failed to create checkout session" });
        }
    }
});

// Route to handle successful payment or direct success for testing
app.get('/success', async (req, res) => {
    if (userData) {
        // Generate a simulated or real numerology reading based on Testing mode
        if (Testing) {
            // Simulate a numerology reading
            const reading = `Simulated reading for ${userData.fullName} with birth date ${userData.birthDate}.`;
            console.log(`Sending email to ${userData.email} with reading:`, reading);

            // Simulate response for testing
            userData = null;
            res.send("Thank you! (Simulated) Your reading will be sent to your email shortly.");
        } else {
            // Generate a real reading using ChatGPT
            const prompt = `Generate a numerology reading based on the name "${userData.fullName}" and birth date "${userData.birthDate}".`;
            try {
                const response = await axios.post('https://api.openai.com/v1/completions', {
                    model: "gpt-3.5-turbo",
                    prompt: prompt,
                    max_tokens: 200,
                }, {
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    },
                });

                const reading = response.data.choices[0].text;

                // Placeholder for sending email with real reading
                console.log(`Sending email to ${userData.email} with reading:`, reading);

                userData = null;
                res.send("Thank you! Your reading will be sent to your email shortly.");
            } catch (error) {
                console.error("Error generating reading:", error);
                res.status(500).send("Failed to generate reading.");
            }
        }
    } else {
        res.redirect('/');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
