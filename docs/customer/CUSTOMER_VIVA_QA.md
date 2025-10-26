# Customer Viva Guide: Online Catalog, Cart, and Checkout

This guide prepares students for a viva of the customer-facing site. It covers browsing, cart, checkout, order history, and links each UI step to the backend APIs. It also explains tax, bill numbers, and payment references.

## What the Customer can do
- Browse and search products; filter by category
- View product details with images and promotion text (if present)
- Manage the shopping cart (add/update/remove/clear)
- Secure checkout (JWT-protected)
- View order history and order details

## End-to-end customer flow
1. Browse products
   - Page: `frontend/src/pages/Products.js`
   - GET `/api/online/products?categoryId=&search=&minPrice=&maxPrice=`
   - Categories: GET `/api/online/categories`
2. Trending on Home
   - Page: `frontend/src/pages/Home.js`
   - GET `/api/online/products/trending?limit=10` (can include POS in aggregation when configured)
3. Product detail
   - Page: `frontend/src/pages/ProductDetail.js`
   - GET `/api/online/products/{id}`
   - Shows `promotionalDetails` when present
4. Cart management (requires login)
   - Context: `frontend/src/contexts/CartContext.js`
   - Add: POST `/api/online/cart/add`
   - Get: GET `/api/online/cart`
   - Update qty: PUT `/api/online/cart/update`
   - Remove item: DELETE `/api/online/cart/remove/{productId}`
   - Clear: DELETE `/api/online/cart/clear`
   - Count badge: GET `/api/online/cart/count`
5. Checkout (requires login)
   - Page: `frontend/src/pages/Checkout.js`
   - POST `/api/online/checkout` — server computes tax and net using the live rate
   - Public tax display (read-only): GET `/api/settings/tax`
6. Orders
   - Pages: `frontend/src/pages/Orders.js`, `frontend/src/pages/OrderDetail.js`
   - List: GET `/api/online/orders`
   - Detail: GET `/api/online/orders/{orderId}`

## API and security mapping
- Controllers:
  - Products: `OnlineProductController` (`/online/products`)
  - Categories: `CategoryController` (`/online/categories`)
  - Cart: `CartController` (`/online/cart/**`)
  - Checkout: `CheckoutController` (`/online/checkout`)
  - Orders: `OnlineOrderController` (`/online/orders/**`)
  - Settings (tax): `SettingsController` (`/settings/tax`)
- Security: `SecurityConfig`
  - Public: `/online/products/**`, `/online/categories/**`, `/settings/**`
  - Auth (CUSTOMER): `/online/cart/**`, `/online/checkout/**`, `/online/orders/**`

## Server-authoritative tax
- Service: `TaxRateService` (file‑backed JSON at `uploads/config/tax-config.json`)
- Checkout recomputes totals on server using current rate; client display is informational only
- Admin can change tax via `/api/admin/settings/tax`; customers see the effect immediately

## Identifiers: bill number and payment reference
- Bill number format: `DVP` + `yyMMdd` + `{userId}` + `HHmmss` (with collision fallback)
  - Implemented in `CheckoutService.generateBillNumber`
- Payment reference format: `REF-` + `{METHOD}` + `yyMMddHHmmss` + `{4 digits}` with uniqueness retries
  - Implemented in `CheckoutService.generateReferenceNumber`

## Frontend components to cite
- Catalog: `Products.js`, `Home.js`
- Product detail: `ProductDetail.js`
- Cart: `contexts/CartContext.js`, `pages/Cart.js`
- Checkout: `pages/Checkout.js`
- Orders: `pages/Orders.js`, `pages/OrderDetail.js`
- Currency: `utils/currency.js` (LKR)

## Data contracts (simplified)
- Checkout request body
  - items: [{ productId, quantity }]
  - shippingAddress: { addressLine1, addressLine2?, city, postalCode }
  - paymentMethod: string
  - shippingMethod?: string
- Checkout response
  - { orderId, transactionId, billNumber, totalAmount, taxAmount, netAmount, orderStatus, placedAt, referenceNumber }

## Edge cases to be ready for
- Insufficient stock at checkout → 400 with message; cart stays, quantities may need adjustment
- Tax changed between cart view and checkout → server uses new rate; amounts may differ slightly from UI preview
- Viewing orders while logged out → 401; must login
- Promotions
  - `promotionalDetails` is optional; components render it only when present
- Currency: LKR everywhere; shared formatter ensures consistency

## Viva Q&A
1) Why is tax read-only from `/settings/tax` for customers?
- To avoid client tampering; only admin can change tax. Checkout uses server’s tax rate.

2) How do you ensure payment reference uniqueness?
- Generate `REF-{METHOD}{yyMMddHHmmss}{4digits}` and check `PaymentRepository`; retry if exists.

3) What happens if a product goes out of stock during checkout?
- Server validates availability before creating the order and fails fast with a clear error.

4) How are totals validated?
- Server recomputes from `TransactionItem`s after persistence to guarantee accuracy.

5) Where does the order history come from?
- `/online/orders` and `/online/orders/{orderId}` scoped by the authenticated user.

6) Do you mix POS and Online products?
- Data model separates `products` and `online_products`; browsing is from the online set; trending can optionally include POS transactions in aggregation.

## Troubleshooting tips
- 401 on cart/checkout/orders: check JWT is set and role is CUSTOMER
- Prices look off: check current tax via `/api/settings/tax`
- Promotions not visible: ensure product has `promotionalDetails` in API response and components render conditionally
- Currency shows differently: confirm `utils/currency.js` usage in the page
