# Changes & Additions

Date: 2025-10-23

This document summarizes recent functional changes across backend and frontend.

## Backend
- Bill numbers now use format `DVP{yyMMdd}{userId}{HHmmss}` with collision fallback.
- Payment references use format `REF-{METHOD}{yyMMddHHmmss}{NNNN}` with uniqueness checks; METHOD mapped to `CASH|COD|DC|CC`.
- Introduced file-backed global tax service:
	- Default from `app.tax.rate`.
	- Admin-manageable via `/api/admin/settings/tax` (GET/PUT).
	- Public read via `/api/settings/tax`.
- POS and online checkout compute tax server-side using the global rate (client totals validated/recomputed).
- Trending products endpoint returns most-purchased items for Home page.

## Frontend
- Sitewide currency formatting in LKR via `src/utils/currency.js`.
- Admin Gift Shop Manager displays prices and averages in LKR.
- Cart and Checkout read the live tax rate from `/api/settings/tax`; labels reflect the current rate.
- POS UI aligns with server-authoritative tax; label shows the live rate.
- Home page:
	- Added “Trending Now” and “More Products” (with Load More 10 at a time).
	- Entire product card is clickable; added a subtle primary-colored hover hint “View ›”.
	- Shows `promotionalDetails` for items that have it.

## Security
- `/api/settings/tax` exposed publicly for read-only.
- `/api/admin/settings/tax` secured to admins.

## Notes
- Settings changes persist to `uploads/config/tax-config.json`; no DB migrations required.
