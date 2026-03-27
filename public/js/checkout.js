/* Checkout page — form submission to /api/orders */
document.addEventListener('DOMContentLoaded', () => {
    const items = Cart.getItems();
    const form = document.getElementById('checkout-form');
    const formWrapper = document.getElementById('checkout-form-wrapper');
    const confirmation = document.getElementById('order-confirmation');
    const checkoutItems = document.getElementById('checkout-items');
    const checkoutTotal = document.getElementById('checkout-total');
    const errorEl = document.getElementById('checkout-error');

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

    // Handle form submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorEl.style.display = 'none';

        // Collect form data
        const data = {
            customer_name: form.customer_name.value.trim(),
            customer_email: form.customer_email.value.trim(),
            customer_phone: form.customer_phone.value.trim(),
            shipping_address: form.shipping_address.value.trim(),
            shipping_city: form.shipping_city.value.trim(),
            shipping_zip: form.shipping_zip.value.trim(),
            items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity }))
        };

        // Client-side validation
        if (!data.customer_name || !data.customer_email || !data.shipping_address || !data.shipping_city || !data.shipping_zip) {
            showError('Please fill in all required fields.');
            return;
        }

        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await res.json();

            if (!res.ok) {
                showError(result.error || 'Something went wrong. Please try again.');
                return;
            }

            // Success
            Cart.clear();
            formWrapper.style.display = 'none';
            document.getElementById('confirm-order-id').textContent = result.order_id;
            document.getElementById('confirm-total').textContent = result.total.toFixed(2);
            confirmation.style.display = 'block';
        } catch (err) {
            showError('Network error. Please check your connection and try again.');
        }
    });

    function showError(msg) {
        errorEl.textContent = msg;
        errorEl.style.display = 'block';
    }
});

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
