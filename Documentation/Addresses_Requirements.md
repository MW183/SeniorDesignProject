# Addresses — Programming Requirements

1. Middleware
 - [X] requireAuth on POST/PUT/DELETE
 - [X] requireRole for DELETE
 - [X] Validation via validateBody and validateQuery

2. Validation
 - [X] Uses centralized Zod schemas (addressSchema)
 - [X] Partial updates supported via addressSchema.partial()
 - [X] Query params validated via addressQuerySchema

3. Logging

- [X] Prints user id and action for create/update/delete
- [X] Pagination & Filtering
- [X] Supports limit/offset (default 20/0)
- [X] Filters: street, city, state, zip, type
- [X] Partial, case-insensitive matches for street/city
- [X] Returns total count for paging

4. Future-proofing

- [ ]TODO added for soft delete
- [ ] Structured for easy extension
