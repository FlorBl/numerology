document.getElementById("readingForm").addEventListener("submit", async function(event) {
    event.preventDefault(); // Prevent default form submission

    const fullName = document.getElementById('fullName').value;
    const birthDate = document.getElementById('birthDate').value;
    const email = document.getElementById('email').value;

    try {
        // Send user data to the backend to create a checkout session
        const response = await fetch('/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName, birthDate, email })
        });

        const data = await response.json();

        if (data.id) {
            // Redirect to Stripe checkout
            const stripe = Stripe('pk_live_51QEtfIFV30F9kFiczsUvWtoznqXywtmqMB1SIuIDP2f2pF6Fd88kWmi51q3iN7cWREZAxUzwVOg2r4ZSESKkOcBB009aztmQCr'); // Replace with your Stripe public key
            await stripe.redirectToCheckout({ sessionId: data.id });
        } else {
            alert("An error occurred: " + data.error);
        }
    } catch (error) {
        console.error("Error creating checkout session:", error);
        alert("Failed to create checkout session.");
    }
});
