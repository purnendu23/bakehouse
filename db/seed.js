const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'bakehouse.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Run schema
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

// Preserve admin users before dropping tables
const adminUsers = [];
try {
    const admins = db.prepare('SELECT * FROM users WHERE is_admin = 1').all();
    adminUsers.push(...admins);
} catch (e) {
    // users table may not exist yet
}

// Drop existing tables and recreate
db.exec(`
    DROP TABLE IF EXISTS order_items;
    DROP TABLE IF EXISTS orders;
    DROP TABLE IF EXISTS products;
    DROP TABLE IF EXISTS categories;
    DROP TABLE IF EXISTS sessions;
    DROP TABLE IF EXISTS users;
`);
db.exec(schema);

// Restore admin users
if (adminUsers.length > 0) {
    const restoreUser = db.prepare(
        'INSERT INTO users (id, email, password_hash, name, provider, provider_id, verified, verification_token, reset_token, reset_token_expires, is_admin, phone, organization, shipping_address, shipping_address2, shipping_city, shipping_state, shipping_zip, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    for (const u of adminUsers) {
        restoreUser.run(u.id, u.email, u.password_hash, u.name, u.provider, u.provider_id, u.verified, u.verification_token, u.reset_token || null, u.reset_token_expires || null, u.is_admin, u.phone, u.organization, u.shipping_address, u.shipping_address2, u.shipping_city, u.shipping_state, u.shipping_zip, u.created_at);
    }
    console.log(`  - ${adminUsers.length} admin user(s) preserved`);
}

// Seed categories
const insertCategory = db.prepare('INSERT OR IGNORE INTO categories (name, description) VALUES (?, ?)');
const categories = [
    ['Healthy Bars', 'Wholesome, nutritious bars baked with natural ingredients'],
    ['Coffee Cakes', 'Tender coffee cakes perfect with your morning brew'],
];
for (const [name, desc] of categories) {
    insertCategory.run(name, desc);
}

// Seed products
const insertProduct = db.prepare(
    'INSERT OR IGNORE INTO products (name, description, price, image_url, category_id, stock, featured, ingredients, nutritional_info) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
);

const products = [
    
    // Healthy Bars (category 1)
    ['Golden Pista', 'A premium pistachio bar crafted with wholesome natural ingredients.', 4.50, JSON.stringify(['/images/golden-pista/front_picture.jpg', '/images/golden-pista/nakpic_1.jpg', '/images/golden-pista/nakpic_2.jpg', '/images/golden-pista/ingredients_picture.jpg']), 1, 50, 1,
        'Pistachios, Dates, Oats, Honey, Coconut Oil, Cardamom, Sea Salt',
        'Serving Size: 1 bar (40g)\nCalories: 180\nTotal Fat: 9g\nSaturated Fat: 3g\nCholesterol: 0mg\nSodium: 45mg\nTotal Carbohydrates: 22g\nDietary Fiber: 3g\nTotal Sugars: 12g\nProtein: 5g'],
    ['EnergyBite', 'A power-packed energy bar to fuel your day.', 3.0, JSON.stringify(['/images/energybite/front_picture.jpg', '/images/energybite/nakpic_1.jpg', '/images/energybite/nakpic_2.jpg', '/images/energybite/ingredients_picture.jpg']), 1, 60, 1,
        'Rolled Oats, Peanut Butter, Dark Chocolate Chips, Honey, Chia Seeds, Flaxseed, Vanilla Extract',
        'Serving Size: 1 bar (35g)\nCalories: 160\nTotal Fat: 7g\nSaturated Fat: 2g\nCholesterol: 0mg\nSodium: 35mg\nTotal Carbohydrates: 20g\nDietary Fiber: 4g\nTotal Sugars: 9g\nProtein: 6g'],

    // Coffee Cakes (category 2)
    ['Orange Kiss Almond Cake', 'A delightful almond cake with a hint of fresh orange zest.', 22.00, JSON.stringify(['/images/orange-kiss-almond-cake/front_picture.jpg', '/images/orange-kiss-almond-cake/nakpic_1.jpg', '/images/orange-kiss-almond-cake/nakpic_2.jpg', '/images/orange-kiss-almond-cake/ingredients_picture.jpg']), 2, 15, 1,
        'Almond Flour, Butter, Sugar, Eggs, Fresh Orange Zest, Orange Juice, Vanilla Extract, Baking Powder, Sea Salt',
        'Serving Size: 1 slice (85g)\nCalories: 280\nTotal Fat: 16g\nSaturated Fat: 6g\nCholesterol: 55mg\nSodium: 120mg\nTotal Carbohydrates: 30g\nDietary Fiber: 2g\nTotal Sugars: 18g\nProtein: 6g'],
];

for (const p of products) {
    insertProduct.run(...p);
}

console.log('Database seeded successfully!');
console.log(`  - ${categories.length} categories`);
console.log(`  - ${products.length} products`);
db.close();
