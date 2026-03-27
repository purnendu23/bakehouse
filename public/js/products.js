/* Products listing page */
document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const categoryFilter = document.getElementById('category-filter');
    const searchInput = document.getElementById('search-input');
    const productsList = document.getElementById('products-list');

    // Load categories for filter dropdown
    try {
        const res = await fetch('/api/categories');
        const categories = await res.json();
        for (const cat of categories) {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = cat.name;
            categoryFilter.appendChild(opt);
        }
        // Set initial category from URL
        if (params.get('category')) {
            categoryFilter.value = params.get('category');
        }
    } catch (err) {
        console.error('Failed to load categories:', err);
    }

    async function loadProducts() {
        const qp = new URLSearchParams();
        if (categoryFilter.value) qp.set('category', categoryFilter.value);
        if (searchInput.value.trim()) qp.set('search', searchInput.value.trim());

        try {
            const res = await fetch('/api/products?' + qp.toString());
            const products = await res.json();
            if (products.length === 0) {
                productsList.innerHTML = '<p class="cart-empty">No products found.</p>';
            } else {
                productsList.innerHTML = products.map(productCardHTML).join('');
            }
        } catch (err) {
            productsList.innerHTML = '<p class="cart-empty">Failed to load products.</p>';
        }
    }

    categoryFilter.addEventListener('change', loadProducts);

    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(loadProducts, 300);
    });

    // Initial load
    loadProducts();
});

/* Reuse from app.js — these are duplicated here so products.html works standalone */
function productCardHTML(product) {
    return `
        <div class="product-card">
            <div class="product-card-img">🧁</div>
            <div class="product-card-body">
                <div class="product-card-category">${escapeHTML(product.category_name || '')}</div>
                <h3><a href="/product.html?id=${product.id}">${escapeHTML(product.name)}</a></h3>
                <p class="product-card-desc">${escapeHTML(truncate(product.description, 80))}</p>
                <div class="product-card-footer">
                    <span class="product-price">$${product.price.toFixed(2)}</span>
                    <button class="btn btn-primary btn-sm" onclick="addToCart(${product.id}, '${escapeAttr(product.name)}', ${product.price})">Add to Cart</button>
                </div>
            </div>
        </div>
    `;
}

function addToCart(id, name, price) {
    Cart.addItem({ id, name, price });
    showToast(`${name} added to cart!`);
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

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function escapeAttr(str) {
    return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.slice(0, len) + '…' : str;
}
