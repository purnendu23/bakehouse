const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'bakehouse.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Run schema
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// Seed categories
const insertCategory = db.prepare('INSERT OR IGNORE INTO categories (name, description) VALUES (?, ?)');
const categories = [
    ['Breads', 'Freshly baked artisan breads'],
    ['Cakes', 'Handcrafted cakes for every occasion'],
    ['Pastries', 'Flaky, buttery pastries made daily'],
    ['Cookies', 'Classic and creative cookie varieties'],
    ['Pies & Tarts', 'Sweet and savory pies and tarts'],
];
for (const [name, desc] of categories) {
    insertCategory.run(name, desc);
}

// Seed products
const insertProduct = db.prepare(
    'INSERT OR IGNORE INTO products (name, description, price, image_url, category_id, stock, featured) VALUES (?, ?, ?, ?, ?, ?, ?)'
);

const products = [
    // Breads (category 1)
    ['Sourdough Loaf', 'Traditional sourdough with a crispy crust and tangy flavor.', 8.50, '/images/sourdough.jpg', 1, 30, 1],
    ['Whole Wheat Bread', 'Hearty whole wheat bread, perfect for sandwiches.', 6.00, '/images/wholewheat.jpg', 1, 40, 0],
    ['Baguette', 'Classic French baguette with a golden crust.', 4.50, '/images/baguette.jpg', 1, 50, 1],
    ['Ciabatta', 'Italian ciabatta with an airy, open crumb.', 5.50, '/images/ciabatta.jpg', 1, 25, 0],
    ['Rye Bread', 'Dense, flavorful rye bread with caraway seeds.', 7.00, '/images/rye.jpg', 1, 20, 0],

    // Cakes (category 2)
    ['Chocolate Fudge Cake', 'Rich, indulgent chocolate cake layered with fudge frosting.', 32.00, '/images/chocfudge.jpg', 2, 10, 1],
    ['Vanilla Sponge Cake', 'Light and fluffy vanilla sponge with buttercream.', 28.00, '/images/vanillasponge.jpg', 2, 12, 0],
    ['Red Velvet Cake', 'Classic red velvet with cream cheese frosting.', 35.00, '/images/redvelvet.jpg', 2, 8, 1],
    ['Carrot Cake', 'Moist carrot cake loaded with walnuts and spices.', 30.00, '/images/carrotcake.jpg', 2, 10, 0],
    ['Lemon Drizzle Cake', 'Zesty lemon cake with a sweet glaze.', 26.00, '/images/lemondrizzle.jpg', 2, 15, 0],

    // Pastries (category 3)
    ['Butter Croissant', 'Flaky, golden croissant made with pure butter.', 3.50, '/images/croissant.jpg', 3, 60, 1],
    ['Pain au Chocolat', 'Chocolate-filled croissant pastry.', 4.00, '/images/painauchocolat.jpg', 3, 50, 0],
    ['Danish Pastry', 'Fruit-topped danish with a sweet glaze.', 4.50, '/images/danish.jpg', 3, 35, 0],
    ['Cinnamon Roll', 'Soft, gooey cinnamon roll with cream cheese icing.', 5.00, '/images/cinnamonroll.jpg', 3, 40, 1],
    ['Almond Croissant', 'Croissant filled with almond frangipane.', 4.50, '/images/almondcroissant.jpg', 3, 30, 0],

    // Cookies (category 4)
    ['Chocolate Chip Cookie', 'Classic cookie loaded with chocolate chips.', 2.50, '/images/chocchip.jpg', 4, 100, 1],
    ['Oatmeal Raisin Cookie', 'Chewy oatmeal cookie with plump raisins.', 2.50, '/images/oatmealraisin.jpg', 4, 80, 0],
    ['Peanut Butter Cookie', 'Rich peanut butter cookies with a crumbly texture.', 2.50, '/images/peanutbutter.jpg', 4, 70, 0],
    ['Snickerdoodle', 'Soft sugar cookie coated in cinnamon sugar.', 2.50, '/images/snickerdoodle.jpg', 4, 90, 0],
    ['Double Chocolate Cookie', 'Dark chocolate cookie with white chocolate chunks.', 3.00, '/images/doublechoc.jpg', 4, 60, 1],

    // Pies & Tarts (category 5)
    ['Apple Pie', 'Classic apple pie with a buttery, flaky crust.', 22.00, '/images/applepie.jpg', 5, 12, 1],
    ['Blueberry Tart', 'Fresh blueberry tart with a shortcrust base.', 20.00, '/images/blueberrytart.jpg', 5, 10, 0],
    ['Pecan Pie', 'Sweet, nutty pecan pie with a caramel filling.', 24.00, '/images/pecanpie.jpg', 5, 8, 0],
    ['Lemon Meringue Pie', 'Tangy lemon curd topped with fluffy meringue.', 23.00, '/images/lemonmeringue.jpg', 5, 10, 1],
    ['Strawberry Tart', 'Fresh strawberry tart with pastry cream.', 21.00, '/images/strawberrytart.jpg', 5, 10, 0],
];

for (const p of products) {
    insertProduct.run(...p);
}

console.log('Database seeded successfully!');
console.log(`  - ${categories.length} categories`);
console.log(`  - ${products.length} products`);
db.close();
