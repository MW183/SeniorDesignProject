# Addresses — Programming Requirements

Core requirements focused on implementation:

- Core CRUD
	- [ ] GET /addresses (collection) — supports pagination (`limit`, `offset`) and basic filters
	- [ ] GET /addresses/:id — 404 when missing
	- [ ] POST /addresses — validate required fields and return 201 with created resource
	- [ ] PUT /addresses/:id — partial updates allowed, validate payload and FKs
	- [ ] DELETE /addresses/:id — enforce business rules (soft vs hard delete); return appropriate status codes

- Pagination
	- [ ] Support `limit` and `offset` query params on collection endpoints; validate ranges and defaults

- Search & Filtering
	- [ ] Allow filtering by `city`, `state`, `zip`, and `type` (venue/vendor/client)
	- [ ] Support partial (case-insensitive) matches for street and city
	- [ ] Combine filters with AND semantics and provide total counts for paging

- Data Validation
	- [ ] Required field checks (street, city, state, zip when applicable)
	- [ ] Field format validation (zip format, state length) and sanitization (trim)
	- [ ] FK existence checks (if linking to other models)
	- [ ] Clear 400 responses with validation error details

- Security & Error Handling
	- [ ] Require authentication where appropriate for writes; role checks for deletions
	- [ ] Map common DB errors to HTTP (unique constraint => 409, FK violation => 400/409)
	- [ ] Avoid exposing raw DB errors in responses
- Notes
