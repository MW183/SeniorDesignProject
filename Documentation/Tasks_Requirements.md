# Tasks — Programming Requirements

Core requirements focused on implementation:

- Core CRUD
	- [X] GET /tasks (collection) — supports pagination and filters (status, assignee, wedding)
	- [X] GET /tasks/:id — 404 when missing
	- [X] POST /tasks — validate required fields (name, dueDate, weddingId) and return 201
	- [X] PUT /tasks/:id — partial updates allowed, validate enums and FKs
	- [X] DELETE /tasks/:id — soft or hard delete per business rules

- Pagination
	- [X] `limit`/`offset` with defaults and maximums; return total counts

- Search & Filtering
	- [X] Partial name search (case-insensitive), filters for status, priority, assigned user, date ranges
	- [X] Combine filters and return paginated results

- Data Validation
	- [X] Enum validation (status), priority range checks, date validation
	- [X] FK existence checks for wedding and user references
	- [X] Clear 400 responses for invalid input

	- [X] Auth required for write operations; role checks for admin actions
	- [X] Proper mapping of DB errors to HTTP responses; do not leak internals

- Template Generator
	- [X] Consistent generation of templates from .csv file in server/templates
