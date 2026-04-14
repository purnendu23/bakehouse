const express = require('express');
const router = express.Router();

// POST /api/orders — place a new order
router.post('/', (req, res) => {
    const db = req.app.locals.db;
    const { customer_name, customer_email, customer_phone, shipping_address, shipping_city, shipping_zip, items, payment_method, payment_id } = req.body;

    // Validate required fields
    if (!customer_name || !customer_email || !shipping_address || !shipping_city || !shipping_zip) {
        return res.status(400).json({ error: 'Missing required customer/shipping fields' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer_email)) {
        return res.status(400).json({ error: 'Invalid email address' });
    }

    const getProduct = db.prepare('SELECT id, price, stock FROM products WHERE id = ?');
    const insertOrder = db.prepare(
        `INSERT INTO orders (customer_name, customer_email, customer_phone, shipping_address, shipping_city, shipping_zip, total, payment_method, payment_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const insertItem = db.prepare(
        'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)'
    );
    const updateStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');

    const placeOrder = db.transaction(() => {
        let total = 0;
        const resolvedItems = [];

        for (const item of items) {
            const productId = parseInt(item.product_id, 10);
            const quantity = parseInt(item.quantity, 10);
            if (isNaN(productId) || isNaN(quantity) || quantity < 1) {
                throw new Error('Invalid item: product_id and quantity (>=1) are required');
            }

            const product = getProduct.get(productId);
            if (!product) throw new Error(`Product ${productId} not found`);
            if (product.stock < quantity) throw new Error(`Insufficient stock for product ${productId}`);

            resolvedItems.push({ product_id: productId, quantity, unit_price: product.price });
            total += product.price * quantity;
        }

        const result = insertOrder.run(
            customer_name, customer_email, customer_phone || null,
            shipping_address, shipping_city, shipping_zip,
            Math.round(total * 100) / 100,
            payment_method || null, payment_id || null
        );
        const orderId = result.lastInsertRowid;

        for (const ri of resolvedItems) {
            insertItem.run(orderId, ri.product_id, ri.quantity, ri.unit_price);
            updateStock.run(ri.quantity, ri.product_id);
        }

        return { id: Number(orderId), total: Math.round(total * 100) / 100 };
    });

    try {
        const order = placeOrder();
        res.status(201).json({ message: 'Order placed successfully', order_id: order.id, total: order.total });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// GET /api/orders/my — get orders for the logged-in user
router.get('/my', (req, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not logged in.' });
    }

    const db = req.app.locals.db;
    const email = req.user.email;

    const orders = db.prepare(
        'SELECT * FROM orders WHERE customer_email = ? ORDER BY created_at DESC'
    ).all(email);

    // Attach items to each order
    const getItems = db.prepare(
        `SELECT oi.*, p.name AS product_name, p.image_url
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ?`
    );

    const result = orders.map(order => ({
        ...order,
        items: getItems.all(order.id),
    }));

    res.json({ orders: result });
});

// GET /api/orders/:id — get order details
router.get('/:id', (req, res) => {
    const db = req.app.locals.db;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid order ID' });

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const orderItems = db.prepare(
        `SELECT oi.*, p.name AS product_name
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ?`
    ).all(id);

    res.json({ ...order, items: orderItems });
});

module.exports = router;
