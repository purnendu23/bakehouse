const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'bakehouse.db'));

// Add columns if missing
try { db.exec('ALTER TABLE products ADD COLUMN ingredients TEXT'); console.log('Added ingredients column'); } catch (e) { console.log('ingredients column already exists'); }
try { db.exec('ALTER TABLE products ADD COLUMN nutritional_info TEXT'); console.log('Added nutritional_info column'); } catch (e) { console.log('nutritional_info column already exists'); }

const update = db.prepare('UPDATE products SET ingredients = ?, nutritional_info = ? WHERE name = ?');

update.run(
    'Pistachios, Dates, Oats, Honey, Coconut Oil, Cardamom, Sea Salt',
    'Serving Size: 1 bar (40g)\nCalories: 180\nTotal Fat: 9g\nSaturated Fat: 3g\nCholesterol: 0mg\nSodium: 45mg\nTotal Carbohydrates: 22g\nDietary Fiber: 3g\nTotal Sugars: 12g\nProtein: 5g',
    'Golden Pista'
);

update.run(
    'Rolled Oats, Peanut Butter, Dark Chocolate Chips, Honey, Chia Seeds, Flaxseed, Vanilla Extract',
    'Serving Size: 1 bar (35g)\nCalories: 160\nTotal Fat: 7g\nSaturated Fat: 2g\nCholesterol: 0mg\nSodium: 35mg\nTotal Carbohydrates: 20g\nDietary Fiber: 4g\nTotal Sugars: 9g\nProtein: 6g',
    'EnergyBite'
);

update.run(
    'Almond Flour, Butter, Sugar, Eggs, Fresh Orange Zest, Orange Juice, Vanilla Extract, Baking Powder, Sea Salt',
    'Serving Size: 1 slice (85g)\nCalories: 280\nTotal Fat: 16g\nSaturated Fat: 6g\nCholesterol: 55mg\nSodium: 120mg\nTotal Carbohydrates: 30g\nDietary Fiber: 2g\nTotal Sugars: 18g\nProtein: 6g',
    'Orange Kiss Almond Cake'
);

// Verify
const products = db.prepare('SELECT name, ingredients IS NOT NULL as has_ing, nutritional_info IS NOT NULL as has_nut FROM products').all();
products.forEach(p => console.log(`  ${p.name}: ingredients=${p.has_ing ? 'YES' : 'NO'}, nutritional=${p.has_nut ? 'YES' : 'NO'}`));

console.log('Product data updated successfully!');
db.close();

