# Clients — Programming Requirements

Core requirements focused on implementation:

- Core CRUD
	- [ ] GET /clients (collection) — pagination (`limit`, `offset`), filtering, total count
	- [ ] GET /clients/:id — 404 when missing
	- [ ] POST /clients — validate required fields and return 201
	- [ ] PUT /clients/:id — partial updates allowed, validate payload and return 200
	- [ ] DELETE /clients/:id — soft delete by default; enforce business rules when preventing deletion

- Pagination
	- [ ] Validate `limit` and `offset`, set sensible defaults and maxima

- Search & Filtering
	- [ ] Support partial name/email search (case-insensitive), filters by created date and other relevant fields
	- [ ] Combine filters; return counts for UI pagination

- Data Validation
	- [ ] Required fields validation; email format when provided; phone format optional
	- [ ] Sanitization (trim, normalize case for email)
	- [ ] Duplicate detection (unique keys) and clear 409 responses

	- [ ] Require authentication for write operations; role checks for sensitive operations
	- [ ] Map DB errors to HTTP codes (validation => 400, unique constraint => 409)
	- [ ] Do not leak DB internals in error messages
