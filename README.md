# Bistro Eleven - Food Ordering System

## What this app does
Bistro Eleven is an interactive web-based food ordering system. It allows customers to browse the menu, add items to their cart, and place orders for Delivery or Dine-in. It also features a fully functional Admin Portal where the management can view incoming orders in real-time, complete/cancel orders, add new custom dishes to the catalog, and track total sales revenue. The app uses browser LocalStorage for persistent data state.

## What this app does NOT do
- It does not process real payments or connect to payment gateways.
- It does not have a real backend database (it relies purely on client-side LocalStorage).
- It does not support multi-user real-time synchronization (orders placed on one device will not appear on another device).
- It does not support actual password encryption (authentication is simulated).

## Demo Accounts
To test the application, you can log in using the following pre-configured demo accounts:

**Admin Account (Management)**
- Username: `admin`
- Password: `admin123`

**Client Account (Customer)**
- Username: `Margaret`
- Password: `1234`
- *(Or you can create a new account using the Sign Up form!)*

## How to run it locally

1. Ensure you have Node.js installed on your computer.
2. Open a terminal in the project directory.
3. Install the required dependencies by running:
   ```bash
   npm install
   ```
4. Start the local development server by running:
   ```bash
   npm run dev
   ```
5. Open your browser and navigate to the `localhost` URL provided in the terminal (usually `http://localhost:5173`).
