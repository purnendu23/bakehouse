# 🍞 Bakehouse

An online marketplace for fresh baked goods — breads, cakes, pastries, cookies, pies & tarts.

## Tech Stack

- **Frontend:** HTML, CSS, vanilla JavaScript
- **Backend:** Node.js + Express
- **Database:** SQLite (via better-sqlite3)

## Getting Started

```bash
# Install dependencies
npm install

# Seed the database with categories & products
npm run seed

# Start the server
npm start
```

The site will be available at **http://localhost:3000**.

For development with auto-reload:
```bash
npm run dev
```

## Project Structure

```
bakehouse/
├── server.js              # Express server entry point
├── db/
│   ├── schema.sql         # Database table definitions
│   ├── seed.js            # Seed script for initial data
│   └── bakehouse.db       # SQLite database (auto-created)
├── routes/
│   ├── products.js        # GET /api/products, GET /api/products/:id
│   └── orders.js          # POST /api/orders, GET /api/orders/:id
├── public/
│   ├── index.html         # Homepage
│   ├── products.html      # Product listing with filters
│   ├── product.html       # Single product detail
│   ├── cart.html          # Shopping cart
│   ├── checkout.html      # Checkout form
│   ├── css/style.css      # Stylesheet
│   └── js/
│       ├── cart.js         # Cart utility (localStorage)
│       ├── app.js          # Homepage logic
│       ├── products.js     # Product listing logic
│       ├── product-detail.js
│       ├── cart-page.js    # Cart page logic
│       └── checkout.js     # Checkout / order submission
└── README.md
```

## API Endpoints

| Method | Endpoint              | Description                        |
|--------|-----------------------|------------------------------------|
| GET    | /api/categories       | List all categories                |
| GET    | /api/products         | List products (filter: category, featured, search) |
| GET    | /api/products/:id     | Get single product                 |
| POST   | /api/orders           | Place a new order                  |
| GET    | /api/orders/:id       | Get order details                  |

## Database

SQLite database with four tables:
- **categories** — product categories
- **products** — product catalog with stock tracking
- **orders** — customer orders with shipping info
- **order_items** — line items for each order
