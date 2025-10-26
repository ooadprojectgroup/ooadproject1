# Admin Viva Guide: System Walkthrough, Explanations, and Q&A

This guide prepares you to explain the Admin side of DVP Gift Center: how the backend, frontend, and APIs work together. It maps the code, clarifies flows, and provides a curated Q&A bank.

---

## 1) What admin can do (feature map)

- Product Management
  - Create, edit, soft-delete (archive), restore products
  - Mark products available online; set online price/description
  - Manage stock, min/max levels, barcodes, codes
- Category Management
  - Create and manage categories; only Active categories participate online
- Orders Management (online)
  - View orders, filter by status/date; update statuses
- Transactions (POS)
  - View POS bills/transactions for auditing
- Settings (Tax)
  - View and update global tax rate (no DB migration; file-backed)
- Gift Shop Manager (lightweight admin)
  - Quick create/update stock/price for simple products (LKR)

Key UI entry: `/admin` (React). All admin pages are gated by role.

---

## 2) Where to find the admin code (frontend)

- Layout and gating
  - `frontend/src/components/AdminLayout.js` – frame (nav, content)
  - `frontend/src/components/ProtectedRoute.js` – role-gated routes
  - `frontend/src/contexts/AuthContext.js` – JWT, roles, token getter for axios
- Pages (React Router v6)
  - `frontend/src/pages/AdminDashboard.js` – overview metrics
  - `frontend/src/pages/AdminProducts.js` – CRUD products (LKR), filters, modal
  - `frontend/src/pages/AdminCategories.js` – manage categories (active/inactive)
  - `frontend/src/pages/AdminOrders.js` – list/update order statuses
  - `frontend/src/pages/AdminTransactions.js` – view POS transactions
  - `frontend/src/pages/AdminGiftShopManager.js` – quick stock/price manager (LKR)
  - `frontend/src/pages/AdminSettings.js` – view/update global tax
- Shared utils
  - `frontend/src/utils/currency.js` – `formatLKR()` for Rupees
  - `frontend/src/utils/url.js` – resolve backend-hosted images
  - `frontend/src/contexts/ToastContext.js` – toasts for errors/success

Data Load pattern (example from AdminProducts):
- Get token from `AuthContext.getAuthToken()`
- Call axios with `Authorization: Bearer <token>`
- Server response is wrapped: `{ success, data, message }`
- Show Bootstrap toasts on errors

---

## 3) Where to find the admin backend code

- Controllers
  - Products: `/admin/products` (file: `backend/src/main/java/com/dvpgiftcenter/controller/...`)
  - Categories: `/admin/categories` (active list for online)
  - Orders: `/admin/orders` (status update)
  - Transactions: `/admin/transactions`
  - Settings (Tax): `AdminSettingsController` → `/admin/settings/tax`
  - Public Settings read-only: `SettingsController` → `/settings/tax`
- Services (selected)
  - `TaxRateService` – file-backed JSON settings (uploads/config/tax-config.json)
  - `CheckoutService` – online checkout business logic
  - `CashierService` – POS business logic
- Repositories
  - Spring Data JPA interfaces for Products, Categories, Orders, Transactions, Payments

Entities include Product/OnlineProduct (or merged), Category, Transaction, OnlineOrder, OrderItem, Payment, etc.

---

## 4) How security works for admin

- Backend: Spring Security with JWT
  - `SecurityConfig` permits public routes (e.g., `/online/**`, `/settings/**`) and restricts `/admin/**` to `ROLE_ADMIN`
  - Token parsed via filter; roles mapped to `ROLE_<UPPERCASE>`
- Frontend: ProtectedRoute + AuthContext
  - If `isAdmin` is false, user can’t access admin routes

---

## 5) Important business rules admins should know

- Currency: Sitewide LKR (frontend `formatLKR`, backend stores numeric)
- Global Tax Rate
  - Source of truth: `TaxRateService` (file JSON)
  - Default from `application.properties` `app.tax.rate`
  - Endpoints: public GET `/settings/tax`, admin GET/PUT `/admin/settings/tax`
  - POS and Online checkout always recompute totals using this rate server-side
- Identifiers
  - Bill number: `DVP{yyMMdd}{userId}{HHmmss}` with collision fallback
  - Payment reference: `REF-{METHOD}{yyMMddHHmmss}{NNNN}` (`CASH|COD|DC|CC`), uniqueness checked
- Online Visibility
  - A product is shown online only if product is active, category active, and `isAvailableOnline=true`
- Trending
  - Computed on backend from transaction items aggregation (quantity)

---

## 6) Typical request/response (admin)

- List products (admin)
  - `GET /api/admin/products?availability=online|offline&includeArchived=false`
  - Response: `{ success: true, data: [ ...products ] }`
- Create product
  - `POST /api/admin/products` with JSON body (name, price, category, stock, optional online fields)
- Update product
  - `PUT /api/admin/products/{id}` with JSON body
- Soft-delete product
  - `DELETE /api/admin/products/{id}?hard=false` (409 conflict on hard delete if FK referenced)
- Update tax rate (admin)
  - `PUT /api/admin/settings/tax` `{ "taxRate": 0.10 }`
- Read tax rate (public/admin)
  - `GET /api/settings/tax` → `{ success: true, data: { taxRate: 0.10 } }`

---

## 7) How the Gift Shop Manager works (admin)

- UI: `AdminGiftShopManager.js`
  - Fetch: `GET /api/admin/simple-products`
  - Create: `POST /api/admin/simple-products` `{ name, price, stock }`
  - Update stock: `PUT /api/admin/simple-products/{id}/stock` `{ stock }`
  - Delete: `DELETE /api/admin/simple-products/{id}`
  - LKR formatting via `formatLKR`; table header shows `Price (LKR)`

---

## 8) Data validation & errors

- Backend validates required fields (e.g., name, price > 0)
- API returns `{ success:false, message:"..." }` with suitable HTTP status
- Frontend shows toast on error; disables submit when loading; prevents negatives in stock updates

---

## 9) Performance & consistency notes

- Server-authoritative totals prevent tampering and drift between Cart/Checkout/POS
- Settings cached in service and persisted to JSON; defaults from properties
- Indexes on key columns (see README) support typical filters/search

---

## 10) Admin viva – questions and model answers

Architecture & Flow
1. Q: Describe the admin request flow from browser to DB.
   A: React admin page calls axios with Bearer token → Spring Security validates JWT → Controller delegates to Service → Service uses Repositories to query/update MySQL → Result wrapped as `{ success, data }` → UI updates state and shows toast.

2. Q: How are admin pages gated?
   A: Frontend uses ProtectedRoute based on `isAdmin` from AuthContext; backend restricts `/admin/**` to `ROLE_ADMIN` via `SecurityConfig`.

3. Q: What ensures consistent tax across POS/Checkout/Cart?
   A: Single source of truth: `TaxRateService` backed by JSON. Public `/settings/tax` for clients; admin updates via `/admin/settings/tax`. All computations on server use that rate.

Security
4. Q: Where do roles come from and how are they checked?
   A: Roles are stored in DB and embedded in JWT on login. Spring Security maps to `ROLE_*`; we check `hasRole("ADMIN")` for `/admin/**`.

5. Q: How do we prevent hard-delete data loss?
   A: Default product deletion is soft (archive). Hard delete returns 409 if FK references exist, protecting integrity.

Data/Domain
6. Q: How are bill numbers and payment refs generated uniquely?
   A: Bill: `DVP{yyMMdd}{userId}{HHmmss}` with collision fallback. Payment: `REF-{METHOD}{yyMMddHHmmss}{NNNN}`. We check repository existence and retry on collisions.

7. Q: When is a product visible online?
   A: Product must be active, category active, and `isAvailableOnline=true`. Online price/description override standard fields when set.

Frontend
8. Q: How does AdminProducts send authorized requests?
   A: Gets token from `AuthContext.getAuthToken()`; axios includes `Authorization: Bearer <token>`; server validates JWT.

9. Q: Why do we format currency via a helper?
   A: To ensure consistent LKR formatting across all pages and simplify future locale changes. Implemented with `Intl.NumberFormat('en-LK', { currency:'LKR' })`.

Operations
10. Q: How can an admin update the tax without a DB migration?
    A: Use Admin Settings UI → `PUT /admin/settings/tax`. Service persists to `uploads/config/tax-config.json`; clients pick it up via public GET.

Troubleshooting
11. Q: A product won’t appear online. What do you check?
    A: Product `isAvailableOnline`, product is active, category is active; then verify it’s returned by `/online/products` and no auth issues.

12. Q: Totals seem off in Checkout UI.
    A: Confirm `/settings/tax` value, refresh UI cache, and remember server recomputes totals; the persisted amounts are authoritative.

---

## 11) Quick endpoints cheat sheet (admin)

- Products: `GET/POST/PUT/DELETE /api/admin/products`
- Categories: `GET/POST/PUT/DELETE /api/admin/categories`
- Orders: `GET /api/admin/orders`, `PUT /api/admin/orders/{id}/status`
- Transactions: `GET /api/admin/transactions`
- Settings (Tax): `GET/PUT /api/admin/settings/tax`
- Public Settings (Tax): `GET /api/settings/tax`
- Gift Shop: `GET/POST/PUT/DELETE /api/admin/simple-products`

---

## 12) File paths to cite in viva

- Frontend: `frontend/src/pages/AdminProducts.js`, `AdminOrders.js`, `AdminTransactions.js`, `AdminGiftShopManager.js`, `AdminSettings.js`, `components/AdminLayout.js`, `components/ProtectedRoute.js`, `utils/currency.js`
- Backend: `controller/AdminSettingsController.java`, `controller/SettingsController.java`, services (`TaxRateService`, `CheckoutService`, `CashierService`), security (`config/SecurityConfig.java`), repositories and entities under their respective packages.

---

## 13) Extras (UX and accessibility)

- Home cards fully clickable with a primary-colored hover hint; keyboard accessible via Enter/Space
- Promotional details render when present on products (cards and detail page)
- Admin pages show toasts for errors and disable actionable buttons while requests are in-flight

---

Prepared for panel discussions. Keep this open and cite exact filenames and endpoints as needed.
