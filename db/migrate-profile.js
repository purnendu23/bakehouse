const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'bakehouse.db'));
const cols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);

const toAdd = [
    ['phone', 'TEXT'],
    ['organization', 'TEXT'],
    ['shipping_address', 'TEXT'],
    ['shipping_address2', 'TEXT'],
    ['shipping_city', 'TEXT'],
    ['shipping_state', 'TEXT'],
    ['shipping_zip', 'TEXT'],
];

for (const [name, type] of toAdd) {
    if (!cols.includes(name)) {
        db.exec(`ALTER TABLE users ADD COLUMN ${name} ${type}`);
        console.log(`Added column: ${name}`);
    } else {
        console.log(`Column already exists: ${name}`);
    }
}

db.close();
console.log('Migration complete.');

