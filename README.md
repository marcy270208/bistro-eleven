# Bistro Eleven - Food Ordering System

## 1. Project Description
Bistro Eleven is an interactive web-based food ordering system designed to streamline the restaurant experience. It allows customers to browse a digital menu, customize their orders, and check out securely. For the management team, it provides a comprehensive dashboard to track incoming orders, manage the menu catalog, and view sales statistics, all persisting locally in the browser.

## 2. What the Administrator can do
- **Manage Orders:** View a real-time list of all incoming customer orders, and mark them as "Completed" or "Canceled".
- **Catalog Management:** Add new dishes to the menu with custom names, descriptions, prices, and images.
- **View Analytics:** Track the total number of incoming orders and calculate total sales revenue dynamically.

## 3. What the Client can do
- **Browse Menu:** View available dishes, prices, and descriptions on the home page.
- **Shopping Cart:** Add or remove items from a dynamic cart drawer and see the real-time total.
- **Place Orders:** Fill out a checkout form, choose between "Delivery" or "Dine-in", and add special notes.
- **Order History:** Log into their personal dashboard to see the status of their past orders.

## 4. Pages Built for the Midterm
- **Home Page (`/`)**: Displays the hero banner, the main restaurant menu (dishes mapped from state), and customer reviews.
- **Login Page (`/login`)**: A controlled authentication form that validates credentials and redirects users based on their role (admin or client).
- **Dashboard Page (`/dashboard`)**: A dual-purpose page. If logged in as an Admin, it shows the order management table and business stats. If logged in as a Client, it shows their personal order history.
- **Checkout Page (`/checkout`)**: Displays the final cart summary and a form to collect order details (dine-in/delivery, notes) before processing the transaction.

## 5. Rough Data Sketch (Data Model)
Our system revolves around two main data structures stored in LocalStorage:

**Order Record:**
- `id` (String): Unique identifier (e.g., "ORD-123")
- `customerName` (String): Name of the client who ordered
- `items` (Array): List of dishes ordered (including quantity and subtotal)
- `totalPrice` (Number): Final calculated price
- `type` (String): "Delivery" or "Dine-in"
- `notes` (String): Special instructions (e.g., "No spicy")
- `status` (String): "Pending", "Completed", or "Canceled"
- `timestamp` (Date): When the order was placed

**Dish Record:**
- `id` (String): Unique dish identifier (e.g., "pizza-pep")
- `name` (String): Name of the dish
- `description` (String): Ingredients or details
- `price` (Number): Cost in Rupiah
- `image` (String): Path to the image asset

---

## Technical Limitations (What it does NOT do)
- It does not process real payments.
- It relies purely on client-side LocalStorage (no real backend database).

## Demo Accounts
**Admin Account** (Username: `admin` | Password: `admin123`)
**Client Account** (Username: `Margaret` | Password: `1234`)

## How to run it locally
1. `npm install`
2. `npm run dev`
