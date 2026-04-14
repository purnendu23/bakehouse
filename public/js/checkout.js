/* Checkout page — multi-step: Shipping → Payment → Review → Place Order */
document.addEventListener('DOMContentLoaded', async () => {
    const items = Cart.getItems();
    const form = document.getElementById('checkout-form');
    const formWrapper = document.getElementById('checkout-form-wrapper');
    const confirmation = document.getElementById('order-confirmation');
    const checkoutItems = document.getElementById('checkout-items');
    const checkoutTotal = document.getElementById('checkout-total');

    if (items.length === 0) {
        formWrapper.innerHTML = `
            <div class="cart-empty">
                <p>Your cart is empty. Add items before checking out.</p>
                <a href="/products.html" class="btn btn-primary">Browse Products</a>
            </div>
        `;
        return;
    }

    // Render order summary
    checkoutItems.innerHTML = items.map(item => `
        <div class="checkout-item">
            <span>${escapeHTML(item.name)} &times; ${item.quantity}</span>
            <span>$${(item.price * item.quantity).toFixed(2)}</span>
        </div>
    `).join('');
    checkoutTotal.textContent = Cart.getTotal().toFixed(2);

    // ─── "Use profile info" checkbox ─────────────────────
    let profileData = null;
    let isLoggedIn = false;
    try {
        const meRes = await fetch('/api/auth/me');
        const meData = await meRes.json();
        if (meData.user) {
            isLoggedIn = true;
            const profRes = await fetch('/api/auth/profile');
            const profData = await profRes.json();
            if (profData.profile) {
                profileData = profData.profile;
                document.getElementById('use-profile-wrapper').style.display = '';
            }
        }
    } catch (e) {
        // Not logged in or fetch failed — keep checkbox hidden
    }

    const useProfileCheckbox = document.getElementById('use-profile-info');
    if (useProfileCheckbox) {
        useProfileCheckbox.addEventListener('change', () => {
            if (useProfileCheckbox.checked && profileData) {
                form.customer_name.value = profileData.name || '';
                form.customer_email.value = profileData.email || '';
                form.customer_phone.value = profileData.phone || '';
                form.shipping_address.value = profileData.shipping_address || '';
                form.shipping_address2.value = profileData.shipping_address2 || '';
                form.shipping_city.value = profileData.shipping_city || '';
                form.shipping_state.value = profileData.shipping_state || '';
                form.shipping_zip.value = profileData.shipping_zip || '';
            } else {
                form.customer_name.value = '';
                form.customer_email.value = '';
                form.customer_phone.value = '';
                form.shipping_address.value = '';
                form.shipping_address2.value = '';
                form.shipping_city.value = '';
                form.shipping_state.value = '';
                form.shipping_zip.value = '';
            }
        });
    }

    // ─── Fetch payment config ────────────────────────────
    let stripePublicKey = null;
    let paypalClientId = null;
    let stripe = null;

    try {
        const configRes = await fetch('/api/payments/config');
        const config = await configRes.json();
        stripePublicKey = config.stripePublicKey;
        paypalClientId = config.paypalClientId;
    } catch (e) {
        console.error('Failed to load payment config:', e);
    }

    // ─── Initialize Stripe (but don't mount yet — step 2 is hidden) ──
    let stripeElements = null;
    let cardNumberElement = null;
    let cardExpiryElement = null;
    let cardCvcElement = null;
    let cardMounted = false;
    if (stripePublicKey && window.Stripe) {
        stripe = Stripe(stripePublicKey);
        stripeElements = stripe.elements();
    } else {
        document.getElementById('stripe-card-number').innerHTML =
            '<p style="color:#c00;">Stripe is not configured. Card payments are unavailable.</p>';
    }

    function mountStripeCard() {
        if (!stripeElements || cardMounted) return;

        const elementStyle = {
            base: {
                fontSize: '16px',
                color: '#333',
                '::placeholder': { color: '#999' },
            },
        };

        cardNumberElement = stripeElements.create('cardNumber', { style: elementStyle, showIcon: true });
        cardExpiryElement = stripeElements.create('cardExpiry', { style: elementStyle });
        cardCvcElement = stripeElements.create('cardCvc', { style: elementStyle });

        cardNumberElement.mount('#stripe-card-number');
        cardExpiryElement.mount('#stripe-card-expiry');
        cardCvcElement.mount('#stripe-card-cvc');

        const errEl = document.getElementById('stripe-card-errors');
        [cardNumberElement, cardExpiryElement, cardCvcElement].forEach(el => {
            el.on('change', (event) => {
                errEl.textContent = event.error ? event.error.message : '';
            });
        });

        cardMounted = true;
    }

    // ─── Show PayPal option if configured ────────────────
    if (paypalClientId) {
        document.getElementById('paypal-method-option').style.display = '';
    }

    // ─── Step navigation ─────────────────────────────────
    const steps = ['shipping', 'payment', 'review'];
    let currentStep = 0;
    let selectedMethod = 'stripe';

    function goToStep(index) {
        steps.forEach((s, i) => {
            document.getElementById('step-' + s).style.display = i === index ? 'block' : 'none';
            const ind = document.getElementById('step-ind-' + (i + 1));
            ind.classList.toggle('active', i === index);
            ind.classList.toggle('done', i < index);
        });
        currentStep = index;

        // Reset error messages and button state on every step change
        hideCheckoutError();
        const placeBtn = document.getElementById('btn-place-order');
        if (placeBtn) {
            placeBtn.disabled = false;
            placeBtn.textContent = 'Place Order';
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Step 1 → Step 2
    document.getElementById('btn-to-payment').addEventListener('click', () => {
        const errEl = document.getElementById('shipping-error');
        errEl.style.display = 'none';

        const name = form.customer_name.value.trim();
        const email = form.customer_email.value.trim();
        const address = form.shipping_address.value.trim();
        const city = form.shipping_city.value.trim();
        const state = form.shipping_state.value;
        const zip = form.shipping_zip.value.trim();

        if (!name || !email || !address || !city || !state || !zip) {
            errEl.textContent = 'Please fill in all required fields.';
            errEl.style.display = 'block';
            return;
        }

        goToStep(1);

        // Mount Stripe card element now that step 2 is visible
        mountStripeCard();
    });

    // Payment method toggle
    document.querySelectorAll('.payment-method input').forEach(radio => {
        radio.addEventListener('change', () => {
            document.querySelectorAll('.payment-method').forEach(pm => pm.classList.remove('selected'));
            radio.closest('.payment-method').classList.add('selected');
            selectedMethod = radio.value;

            document.getElementById('stripe-card-section').style.display = selectedMethod === 'stripe' ? '' : 'none';
            document.getElementById('paypal-section').style.display = selectedMethod === 'paypal' ? '' : 'none';
        });
    });

    // Step 2 → Step 3
    document.getElementById('btn-to-review').addEventListener('click', () => {
        const errEl = document.getElementById('payment-error');
        errEl.style.display = 'none';

        if (selectedMethod === 'stripe' && !stripe) {
            errEl.textContent = 'Stripe is not available. Please select another payment method.';
            errEl.style.display = 'block';
            return;
        }

        // Populate review — shipping
        const stateText = form.shipping_state.options[form.shipping_state.selectedIndex].text;
        document.getElementById('review-shipping').innerHTML = `
            <p><strong>${escapeHTML(form.customer_name.value)}</strong></p>
            <p>${escapeHTML(form.shipping_address.value)}${form.shipping_address2.value ? ', ' + escapeHTML(form.shipping_address2.value) : ''}</p>
            <p>${escapeHTML(form.shipping_city.value)}, ${escapeHTML(stateText)} ${escapeHTML(form.shipping_zip.value)}</p>
            <p>${escapeHTML(form.customer_email.value)}${form.customer_phone.value ? ' · ' + escapeHTML(form.customer_phone.value) : ''}</p>
        `;

        // Populate review — payment
        document.getElementById('review-payment').innerHTML = selectedMethod === 'stripe'
            ? '<p>💳 Credit / Debit Card (Stripe)</p>'
            : '<p>🅿️ PayPal</p>';

        // Show the right place-order section
        document.getElementById('stripe-place-order').style.display = selectedMethod === 'stripe' ? '' : 'none';
        document.getElementById('paypal-place-order').style.display = selectedMethod === 'paypal' ? '' : 'none';

        goToStep(2);

        // Initialize PayPal buttons on step 3 if needed
        if (selectedMethod === 'paypal' && paypalClientId && window.paypal) {
            const container = document.getElementById('paypal-button-container');
            container.innerHTML = '';
            window.paypal.Buttons({
                createOrder: async () => {
                    const res = await fetch('/api/payments/paypal/create-order', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity })) }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error);
                    return data.id;
                },
                onApprove: async (data) => {
                    const captureRes = await fetch('/api/payments/paypal/capture-order', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ orderID: data.orderID }),
                    });
                    const captureData = await captureRes.json();
                    if (captureData.status === 'COMPLETED') {
                        await placeOrder('paypal', captureData.id);
                    } else {
                        showCheckoutError('PayPal payment was not completed. Please try again.');
                    }
                },
                onError: (err) => {
                    console.error('PayPal error:', err);
                    showCheckoutError('PayPal encountered an error. Please try again.');
                },
            }).render('#paypal-button-container');
        }
    });

    // Back buttons
    document.getElementById('btn-back-shipping').addEventListener('click', () => goToStep(0));
    document.getElementById('btn-back-payment').addEventListener('click', () => goToStep(1));
    const backPayPalBtn = document.getElementById('btn-back-payment-pp');
    if (backPayPalBtn) backPayPalBtn.addEventListener('click', () => goToStep(1));

    // ─── Stripe: Place Order (form submit) ───────────────
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (selectedMethod !== 'stripe') return;

        const placeBtn = document.getElementById('btn-place-order');
        placeBtn.disabled = true;
        placeBtn.textContent = 'Processing…';
        hideCheckoutError();

        try {
            // 1. Create PaymentIntent on server
            const intentRes = await fetch('/api/payments/stripe/create-intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity })) }),
            });
            const intentData = await intentRes.json();
            if (!intentRes.ok) {
                showCheckoutError(intentData.error || 'Failed to initialize payment.');
                placeBtn.disabled = false;
                placeBtn.textContent = 'Place Order';
                return;
            }

            // 2. Confirm payment with Stripe.js
            const { error, paymentIntent } = await stripe.confirmCardPayment(intentData.clientSecret, {
                payment_method: { card: cardNumberElement },
            });

            if (error) {
                showCheckoutError(error.message);
                placeBtn.disabled = false;
                placeBtn.textContent = 'Place Order';
                return;
            }

            if (paymentIntent.status === 'succeeded') {
                // 3. Place the order on the backend
                await placeOrder('stripe', paymentIntent.id);
            } else {
                showCheckoutError('Payment was not completed. Please try again.');
                placeBtn.disabled = false;
                placeBtn.textContent = 'Place Order';
            }
        } catch (err) {
            showCheckoutError('Network error. Please check your connection and try again.');
            placeBtn.disabled = false;
            placeBtn.textContent = 'Place Order';
        }
    });

    // ─── Place order on backend after payment ────────────
    async function placeOrder(method, paymentId) {
        const data = {
            customer_name: form.customer_name.value.trim(),
            customer_email: form.customer_email.value.trim(),
            customer_phone: form.customer_phone.value.trim(),
            shipping_address: form.shipping_address.value.trim(),
            shipping_address2: form.shipping_address2.value.trim(),
            shipping_city: form.shipping_city.value.trim(),
            shipping_state: form.shipping_state.value,
            shipping_zip: form.shipping_zip.value.trim(),
            payment_method: method,
            payment_id: paymentId,
            items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        };

        const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        
        const result = await res.json();

        if (!res.ok) {
            showCheckoutError(result.error || 'Failed to place order.');
            return;
        }

        Cart.clear();
        formWrapper.style.display = 'none';
        document.getElementById('confirm-order-id').textContent = result.order_id;
        document.getElementById('confirm-total').textContent = result.total.toFixed(2);
        confirmation.style.display = 'block';

        // Show post-purchase signup for guests
        if (!isLoggedIn) {
            document.getElementById('post-purchase-signup').style.display = '';
        }
    }

    // ─── Post-purchase account creation ───────────────────
    const btnPostSignup = document.getElementById('btn-post-signup');
    const btnSkipSignup = document.getElementById('btn-skip-signup');

    if (btnPostSignup) {
        btnPostSignup.addEventListener('click', async () => {
            const errorDiv = document.getElementById('post-signup-error');
            errorDiv.style.display = 'none';

            const password = document.getElementById('post-signup-password').value;
            const confirm = document.getElementById('post-signup-confirm').value;

            if (!password || password.length < 8) {
                errorDiv.textContent = 'Password must be at least 8 characters.';
                errorDiv.style.display = 'block';
                return;
            }
            if (password !== confirm) {
                errorDiv.textContent = 'Passwords do not match.';
                errorDiv.style.display = 'block';
                return;
            }

            // Use the shipping info they already entered
            const email = form.customer_email.value.trim();
            const name = form.customer_name.value.trim();
            const phone = form.customer_phone.value.trim();
            const shipping_address = form.shipping_address.value.trim();
            const shipping_address2 = form.shipping_address2.value.trim();
            const shipping_city = form.shipping_city.value.trim();
            const shipping_state = form.shipping_state.value;
            const shipping_zip = form.shipping_zip.value.trim();

            btnPostSignup.disabled = true;
            btnPostSignup.textContent = 'Creating…';

            try {
                // 1. Register the account with shipping info
                const regRes = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email, password, name, phone,
                        shipping_address, shipping_address2,
                        shipping_city, shipping_state, shipping_zip,
                    }),
                });
                const regData = await regRes.json();

                if (!regRes.ok) {
                    errorDiv.textContent = regData.error || 'Account creation failed.';
                    errorDiv.style.display = 'block';
                    btnPostSignup.disabled = false;
                    btnPostSignup.textContent = 'Create Account';
                    return;
                }

                // Show success
                document.getElementById('post-signup-form-wrapper').style.display = 'none';
                document.getElementById('post-signup-success').style.display = '';

            } catch (err) {
                errorDiv.textContent = 'Something went wrong. Please try again.';
                errorDiv.style.display = 'block';
                btnPostSignup.disabled = false;
                btnPostSignup.textContent = 'Create Account';
            }
        });
    }

    if (btnSkipSignup) {
        btnSkipSignup.addEventListener('click', () => {
            document.getElementById('post-purchase-signup').style.display = 'none';
        });
    }

    function showCheckoutError(msg) {
        const el = document.getElementById('checkout-error');
        el.textContent = msg;
        el.style.display = 'block';
    }

    function hideCheckoutError() {
        document.getElementById('checkout-error').style.display = 'none';
    }
});

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
