# Clients — Programming Requirements

Core requirements focused on implementation:

- Core CRUD
	- [X] GET /clients (collection) — pagination (`limit`, `offset`), filtering, total count
	- [X] GET /clients/:id — 404 when missing
	- [X] POST /clients — validate required fields and return 201
	- [X] PUT /clients/:id — partial updates allowed, validate payload and return 200
	- [X] DELETE /clients/:id — soft delete by default; enforce business rules when preventing deletion

- Pagination
	- [X] Validate `limit` and `offset`, set sensible defaults and maxima

- Search & Filtering
	- [X] Support partial name/email search (case-insensitive), filters by created date and other relevant fields
	- [X] Combine filters; return counts for UI pagination

- Data Validation
	- [X] Required fields validation; email format when provided; phone format optional
	- [X] Sanitization (trim, normalize case for email)
	- [X] Duplicate detection (unique keys) and clear 409 responses

	- [X] Require authentication for write operations; role checks for sensitive operations
	- [X] Map DB errors to HTTP codes (validation => 400, unique constraint => 409)
	- [X] Do not leak DB internals in error messages
