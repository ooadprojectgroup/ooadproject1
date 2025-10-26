# Cashier Viva Guide: POS Flows, APIs, and Q&A

This guide prepares cashiers (and evaluators) for a viva walkthrough of the in-store POS. It maps UI actions to backend APIs, explains tax/bill/reference logic, and lists common questions with solid answers.

## What the Cashier can do
- Search products (by name/code/barcode) and browse categories
- Build a cart with quantity and line discounts
- Attach a registered customer or use Walk‑in Customer
- Use server-authoritative tax rate for totals (no manual tax entry)
- Create a POS bill and print/download a receipt
- Review past POS transactions with filters

## End-to-end POS flow (happy path)
1. Cashier opens POS at /cashier/pos
   - Frontend: `frontend/src/pages/cashier/CashierDashboard.js`
   - Loads products via GET `/api/cashier/products`
2. Search or scan
   - Name/code search: GET `/api/cashier/products/search?query=...`
   - Barcode scan: GET `/api/cashier/products/barcode/{barcode}`
3. Select customer (optional)
   - GET `/api/cashier/customers/search?term=...` (top 10 active customers)
   - If none, defaults to Walk‑in Customer
4. Totals and tax
   - Subtotal = sum of line totals (unitPrice × qty – per-line discount)
   - Tax computed on server using file‑backed rate (see Tax section)
   - Net = subtotal + tax – bill‑level discount
5. Complete sale
   - POST `/api/cashier/transactions` with items, optional customerId, paymentMethod, optional discountAmount
   - Response returns billNumber, amounts, and items; UI renders a receipt
6. Receipt retrieval (later)
   - GET `/api/cashier/transactions/{transactionId}/receipt`
7. View past bills
   - Page: `frontend/src/pages/cashier/CashierTransactions.js`
   - List/filter: GET `/api/cashier/transactions?bill=...&start=...&end=...`

## API and security mapping
- Controller: `backend/src/main/java/com/dvpgiftcenter/controller/cashier/CashierController.java`
- Service: `backend/src/main/java/com/dvpgiftcenter/service/CashierService.java`
- Security:
  - Method-level: `@PreAuthorize("hasRole('CASHIER') or hasRole('ADMIN')")` on `/cashier/**`
  - Global config: `SecurityConfig` permits public online browsing, but cashier endpoints require auth

## Server-authoritative tax rate
- Service: `backend/src/main/java/com/dvpgiftcenter/service/TaxRateService.java`
- Storage: JSON file at `uploads/config/tax-config.json` (auto-created)
- Read-only public endpoint: GET `/api/settings/tax`
- Admin management: GET/PUT `/api/admin/settings/tax`
- POS and Online both compute tax on the server using the same live rate

## Bill number and payment reference formats
- Bill number (POS and Online): `DVP` + `yyMMdd` + `{userId}` + `HHmmss`
  - Collision handling: append milliseconds, then small random suffix if still needed
  - Implemented in `CashierService.generateBillNumber` and `CheckoutService.generateBillNumber`
- Payment reference: `REF-` + `{METHOD}` + `yyMMddHHmmss` + `{4 digits}`
  - Ensures uniqueness with repository checks and retries
  - Implemented in `CashierService.generatePaymentReference` and `CheckoutService.generateReferenceNumber`

## Frontend components to cite
- `CashierDashboard.js` — POS grid/list view, search, customer picker, totals, submit
- `CashierTransactions.js` — History list, filters, receipt fetch/print (`utils/print.js`)
- `styles/pos.css` — Sticky headers, contained images, responsive layout
- `utils/currency.js` — LKR formatting across UI

## Data contracts (simplified)
- POST /api/cashier/transactions request
  - items: [{ productId, quantity, unitPrice, discountAmount? }]
  - customerId?: number
  - paymentMethod: string (e.g., CASH, CC, DC)
  - discountAmount?: number
- Response
  - { transactionId, billNumber, transactionDate, customerName, totalAmount, taxAmount, discountAmount, netAmount, status, items[] }

## Edge cases to be ready for
- Out-of-stock item: server rejects with 400 and message
- Barcode not found: 404 from `/products/barcode/{barcode}`; UI prompts
- Tax rate changed during day: next POST uses new rate automatically
- Walk-in sale without customer: allowed; receipt shows Walk‑in Customer
- Concurrency: bill number collisions handled; payment refs unique with retries

## Viva Q&A
1) How is access to POS restricted?
- Via `@PreAuthorize` on controller and JWT roles. Only CASHIER or ADMIN can call `/cashier/**`.

2) Where is the tax rate stored and how is it updated?
- In a JSON file managed by `TaxRateService`. Admin updates via `/api/admin/settings/tax`; POS uses whatever the server returns at compute time.

3) If two sales happen in the same second, can bill numbers collide?
- We check existing numbers and append milliseconds, then a short random suffix if needed.

4) How does barcode scanning map to products?
- GET `/cashier/products/barcode/{barcode}` resolves active product by barcode. 404 if not found.

5) Are totals trusted from the client?
- No. The server recomputes and persists amounts (subtotal, tax, net). Client-side is for UX only.

6) Can discounts be applied?
- Line-level discount per item and an optional bill-level discount are supported in the request; totals are recomputed server-side.

7) Where do I find the receipt data later?
- GET `/cashier/transactions/{transactionId}/receipt` returns the snapshot used for printing.

8) What currency is used in POS?
- LKR everywhere in UI using `utils/currency.js`. Backend stores monetary values as BigDecimal.

## Troubleshooting tips
- Unauthorized on POS calls: ensure JWT present and role is CASHIER/ADMIN
- Tax not changing: verify `uploads/config/tax-config.json` and admin endpoint
- Image layout issues on POS grid: check `styles/pos.css` for `.pos-img-box` and `.pos-product-img`
- Printer dialog/formatting: see `frontend/src/utils/print.js`
