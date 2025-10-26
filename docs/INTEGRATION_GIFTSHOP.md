# Gift Shop Manager Integration Notes

The lightweight admin page "Gift Shop Manager" provides quick operations for basic products.

## URL
- Frontend: `/admin/giftshop`

## Display & Currency
- Prices and the average price metric are formatted in LKR using the shared formatter (`src/utils/currency.js`).
- Table header indicates `Price (LKR)`; no USD symbols are shown.

## Stock updates
- Row badges reflect stock levels, with light red highlighting for low stock (< 10).
- Increment/decrement controls call:
	- `PUT /api/admin/simple-products/{id}/stock` with `{ stock: <value> }`.

## Create/Delete
- Create: `POST /api/admin/simple-products` with `{ name, price, stock }`.
- Delete: `DELETE /api/admin/simple-products/{id}`.

## Notes
- This page is intended for quick adjustments; full product management remains under `/admin/products`.
