const express = require('express');
const router = express.Router();

// Middleware: require authenticated admin
function requireAdmin(req, res, next) {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated.' });
    }
    if (!req.user.is_admin) {
        return res.status(403).json({ error: 'Access denied.' });
    }
    next();
}

// All admin API routes require admin auth
router.use(requireAdmin);

// GET /api/admin/stats
router.get('/stats', (req, res) => {
    const db = req.app.locals.db;
    const totalOrders = db.prepare('SELECT COUNT(*) AS count FROM orders').get().count;
    const pendingOrders = db.prepare("SELECT COUNT(*) AS count FROM orders WHERE status = 'pending'").get().count;
    const totalRevenue = db.prepare('SELECT COALESCE(SUM(total), 0) AS sum FROM orders').get().sum;
    const totalUsers = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
    const totalProducts = db.prepare('SELECT COUNT(*) AS count FROM products').get().count;

    res.json({ totalOrders, pendingOrders, totalRevenue, totalUsers, totalProducts });
});

// GET /api/admin/orders
router.get('/orders', (req, res) => {
    const db = req.app.locals.db;
    const orders = db.prepare(`
        SELECT o.*,
            GROUP_CONCAT(oi.product_id || ':' || p.name || ':' || oi.quantity || ':' || oi.unit_price, '|') AS items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN products p ON oi.product_id = p.id
        GROUP BY o.id
        ORDER BY o.created_at DESC
    `).all();

    for (const order of orders) {
        order.items = order.items ? order.items.split('|').map(item => {
            const [product_id, name, quantity, unit_price] = item.split(':');
            return { product_id: +product_id, name, quantity: +quantity, unit_price: +unit_price };
        }) : [];
    }

    res.json(orders);
});

// PATCH /api/admin/orders/:id/status
router.patch('/orders/:id/status', (req, res) => {
    const db = req.app.locals.db;
    const { status, tracking_number, carrier } = req.body;
    const validStatuses = ['pending', 'ready_to_ship', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status.' });
    }
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid order ID.' });

    // Look up current order
    const order = db.prepare('SELECT status, tracking_number, carrier FROM orders WHERE id = ?').get(id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    // Status transition rules
    if (order.status === 'shipped' && status === 'cancelled') {
        return res.status(400).json({ error: 'A shipped order cannot be cancelled.' });
    }
    if (status === 'delivered' && order.status !== 'shipped') {
        return res.status(400).json({ error: 'Only shipped orders can be marked as delivered.' });
    }

    // Shipped requires tracking number and carrier
    if (status === 'shipped') {
        const tn = (tracking_number || '').trim();
        const cr = (carrier || '').trim();
        if (!tn || !cr) {
            return res.status(400).json({ error: 'Tracking number and carrier are required when shipping an order.' });
        }
        db.prepare('UPDATE orders SET status = ?, tracking_number = ?, carrier = ? WHERE id = ?')
            .run(status, tn, cr, id);
    } else {
        // For other statuses, also update tracking if provided
        if (tracking_number !== undefined || carrier !== undefined) {
            db.prepare('UPDATE orders SET status = ?, tracking_number = ?, carrier = ? WHERE id = ?')
                .run(status, (tracking_number || '').trim() || null, (carrier || '').trim() || null, id);
        } else {
            db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
        }
    }

    res.json({ message: 'Status updated.' });
});

// PATCH /api/admin/orders/:id/tracking
router.patch('/orders/:id/tracking', (req, res) => {
    const db = req.app.locals.db;
    const { tracking_number, carrier } = req.body;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid order ID.' });

    db.prepare('UPDATE orders SET tracking_number = ?, carrier = ? WHERE id = ?').run(
        tracking_number || null, carrier || null, id
    );
    res.json({ message: 'Tracking info updated.' });
});

// GET /api/admin/users
router.get('/users', (req, res) => {
    const db = req.app.locals.db;
    const users = db.prepare('SELECT id, email, name, provider, verified, is_admin, created_at FROM users ORDER BY created_at DESC').all();
    res.json(users);
});

// GET /api/admin/products
router.get('/products', (req, res) => {
    const db = req.app.locals.db;
    const products = db.prepare(`
        SELECT p.*, c.name AS category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        ORDER BY p.name
    `).all();
    res.json(products);
});

module.exports = router;
