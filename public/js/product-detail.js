/* Product detail page */
document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');
    const container = document.getElementById('product-detail');

    if (!productId) {
        container.innerHTML = '<p>Product not found.</p>';
        return;
    }

    try {
        const res = await fetch(`/api/products/${encodeURIComponent(productId)}`);
        if (!res.ok) throw new Error('Not found');
        const product = await res.json();

        document.title = `${product.name} — Bakehouse`;

        const stockClass = product.stock > 5 ? 'stock-ok' : 'stock-low';
        const stockText = product.stock > 0 ? `${product.stock} in stock` : 'Out of stock';

        container.innerHTML = `
            <div class="product-detail-img">🧁</div>
            <div class="product-detail-info">
                <div class="product-detail-category">${escapeHTML(product.category_name || '')}</div>
                <h1>${escapeHTML(product.name)}</h1>
                <p class="product-detail-desc">${escapeHTML(product.description || '')}</p>
                <div class="product-detail-price">$${product.price.toFixed(2)}</div>
                <p class="product-detail-stock ${stockClass}">${stockText}</p>
                ${product.stock > 0 ? `
                <div class="quantity-selector">
                    <label for="qty">Quantity:</label>
                    <input type="number" id="qty" value="1" min="1" max="${product.stock}">
                </div>
                <button class="btn btn-primary btn-lg" id="add-to-cart-btn">Add to Cart</button>
                ` : '<button class="btn btn-outline btn-lg" disabled>Out of Stock</button>'}
            </div>
        `;

        const addBtn = document.getElementById('add-to-cart-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                const qty = parseInt(document.getElementById('qty').value, 10) || 1;
                Cart.addItem({ id: product.id, name: product.name, price: product.price }, qty);
                showToast(`${product.name} added to cart!`);
            });
        }
    } catch (err) {
        container.innerHTML = '<p>Product not found.</p>';
    }
});

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function showToast(message) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.style.cssText = 'position:fixed;bottom:2rem;right:2rem;background:#3d2b1f;color:#fff;padding:0.75rem 1.5rem;border-radius:8px;font-size:0.95rem;z-index:1000;opacity:0;transition:opacity 0.3s;';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => { toast.style.opacity = '0'; }, 2000);
}
