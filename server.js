const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Database setup ---
const dbPath = path.join(__dirname, 'db', 'bakehouse.db');

// Auto-initialize DB if it doesn't exist
if (!fs.existsSync(dbPath)) {
    console.log('Database not found. Running seed...');
    require('./db/seed');
}

const db = new Database(dbPath, { readonly: false });
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Make db available to routes
app.locals.db = db;

// --- Middleware ---
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Routes ---
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));

// Categories endpoint
app.get('/api/categories', (req, res) => {
    const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
    res.json(categories);
});

// SPA fallback — serve index.html for unmatched routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Start server ---
app.listen(PORT, () => {
    console.log(`Bakehouse server running at http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close();
    process.exit(0);
});
