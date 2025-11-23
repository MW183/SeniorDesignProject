# Tasks — Programming Requirements

Core requirements focused on implementation:

- Core CRUD
	- [ ] GET /tasks (collection) — supports pagination and filters (status, assignee, wedding)
	- [ ] GET /tasks/:id — 404 when missing
	- [ ] POST /tasks — validate required fields (name, dueDate, weddingId) and return 201
	- [ ] PUT /tasks/:id — partial updates allowed, validate enums and FKs
	- [ ] DELETE /tasks/:id — soft or hard delete per business rules

- Pagination
	- [ ] `limit`/`offset` with defaults and maximums; return total counts

- Search & Filtering
	- [ ] Partial name search (case-insensitive), filters for status, priority, assigned user, date ranges
	- [ ] Combine filters and return paginated results

- Data Validation
	- [ ] Enum validation (status), priority range checks, date validation
	- [ ] FK existence checks for wedding and user references
	- [ ] Clear 400 responses for invalid input

	- [ ] Auth required for write operations; role checks for admin actions
	- [ ] Proper mapping of DB errors to HTTP responses; do not leak internals

