# Users — Programming Requirements

Core requirements focused on implementation:

- Core CRUD
	- [ ] GET /users (collection) — support pagination and filters (role, email)
	- [ ] GET /users/:id — 404 when missing
	- [ ] POST /users — validate required fields, hash password, return 201
	- [ ] PUT /users/:id — partial updates; prevent accidental password exposure
	- [ ] DELETE /users/:id — soft delete by default; restrict to authorized roles

- Pagination
	- [ ] `limit`/`offset` with defaults and maxima; return total counts

- Search & Filtering
	- [ ] Partial name/email search, role filters, exact email filter
	- [ ] Combine filters and return paginated results

- Data Validation & Security
	- [ ] Enforce password hashing, minimum password length, email format
	- [ ] Require auth for protected endpoints; map auth errors to 401/403
	- [ ] Rate limiting noted as future improvement

- Error Handling
	- [ ] Unique constraint => 409, validation => 400, missing resources => 404
	- [ ] Never include raw DB error messages in responses


