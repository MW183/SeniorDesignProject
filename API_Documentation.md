# **Wedding Planning API Documentation**

## **Users API**

### **User Model Schema:**
- **id**: string (UUID, auto-generated)
- **name**: string (required, minimum 2 characters)
- **email**: string (required, unique, valid email format)
- **phone**: string, optional (can be null)
- **password**: string (required, minimum 6 characters)
- **role**: string, required (must be ADMIN, USER, or SUPPORT)
- **createdAt**: Date & Time created (auto-generated)
- **createdBy**: User ID (optional foreign key reference)
- **deletedAt**: Date & Time "deleted" (null for active users, timestamp for soft-deleted)

---

### **Operations:**

#### **GET /users** - Get all active users
- **Returns**: Array of all non-deleted users (NOTE: excludes deleted users via `deletedAt: null` filter)
- **Response**: Users without password field for security
- **Default ordering**: Most recent first (`createdAt: desc`)

#### **Search Operations:**
- **Search by name/email**: `GET /users?search=john` - case-insensitive partial match on name OR email
- **Filter by role**: `GET /users?role=ADMIN` - exact role match (ADMIN, USER, or SUPPORT)
- **Filter by email**: `GET /users?email=john@example.com` - case-insensitive exact email match
- **Pagination**: `GET /users?limit=10&offset=20` - limit results and skip records
- **Combined filters**: `GET /users?search=john&role=USER&limit=5` - multiple filters together

#### **GET /users/:id** - Get single user by ID
- **Returns**: Single user details (excluding password)
- **Filtering**: Only returns active users (not soft-deleted)
- **Error**: 404 if user not found or is deleted

#### **POST /users** - Create new user
- **Required fields**: name, email, password, role
- **Optional fields**: phone, createdById
- **Validations**:
  - Name: minimum 2 characters
  - Email: valid email format, unique constraint
  - Password: minimum 6 characters
  - Role: must be ADMIN, USER, or SUPPORT
- **Data processing**: name/email trimmed, email lowercased
- **Response**: Created user (excluding password)

#### **PUT /users/:id** - Update existing user
- **Updateable fields**: name, email, phone, role (password excluded from updates)
- **Partial updates**: only provided fields are updated
- **Validations**: same as creation for provided fields
- **Filtering**: only updates active users (not soft-deleted)
- **Phone handling**: empty string converts to null, undefined leaves unchanged

#### **DELETE /users/:id** - Soft delete user
- **Behavior**: Sets `deletedAt` timestamp instead of hard deletion
- **Filtering**: only deletes active users (not already deleted)
- **Response**: Confirmation message with user id and name
- **Data preservation**: All user data remains in database

#### **POST /users/search** - Advanced search with pagination
- **Body parameters**:
  ```json
  {
    "query": "search term",           // searches name, email, phone
    "filters": { "role": "ADMIN" },   // additional filters
    "pagination": { "limit": 10, "offset": 0 }
  }
  ```
- **Response**: Users array + pagination metadata (total, hasMore, etc.)

---

### **Automatic Filtering:**
- **Soft delete protection**: All operations automatically exclude soft-deleted users (`deletedAt: null`)
- **Password security**: All responses exclude password field
- **Case-insensitive search**: Name and email searches ignore case
- **Data sanitization**: Automatic trimming of whitespace, email lowercasing

---

### **Error Handling:**
- **409**: Unique constraint failed (duplicate email)
- **404**: Record not found (user doesn't exist or is deleted)
- **400**: Validation errors, foreign key constraint failed
- **500**: Internal server error

---

### **Example Usage:**
```bash
# Get all users
GET /users

# Search for users named "john"
GET /users?search=john

# Get admin users only
GET /users?role=ADMIN

# Get user by specific email
GET /users?email=john@example.com

# Paginated results
GET /users?limit=10&offset=0

# Create user
POST /users
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "secret123",
  "role": "USER",
  "phone": "+1234567890"
}

# Update user
PUT /users/user-uuid-here
{
  "name": "John Smith",
  "phone": null
}

# Soft delete
DELETE /users/user-uuid-here
```

---

## **Coming Soon:**
Clients API
- **Overview**: CRUD for client records. Endpoints implemented and protected for write operations.

Clients Endpoints
- **GET /clients**: list clients. Supports `search`, `email`, `limit`, `offset` query params. Returns sanitized records (no sensitive data).
- **GET /clients/:id**: fetch single client by id. Returns 404 if not found.
- **POST /clients**: create client (requires auth). Validates required `name` and sanitizes fields.
- **PUT /clients/:id**: update client (requires auth). Partial updates supported.
- **DELETE /clients/:id**: delete client (requires `ADMIN` or `SUPPORT`). Business rule: deletion blocked if the client is referenced by a future wedding.

Vendors API
- **Overview**: CRUD for vendors with optional `addressId` foreign key checks.
- **GET /vendors**: list vendors. Supports `search`, `limit`, `offset`.
- **GET /vendors/:id**: fetch vendor by id.
- **POST /vendors**: create vendor (requires auth). Validates `name` and optional `addressId` FK.
- **PUT /vendors/:id**: update vendor (requires auth). Validates `addressId` FK when provided.
- **DELETE /vendors/:id**: delete vendor (requires `ADMIN` or `SUPPORT`).

Weddings API
- **Overview**: CRUD for weddings with date filtering and FK checks for `locationId`, `spouse1Id`, `spouse2Id`.
- **GET /weddings**: list weddings. Supports `dateFrom`, `dateTo`, `limit`, `offset` query params.
- **GET /weddings/:id**: fetch wedding by id.
- **POST /weddings**: create wedding (requires auth). Validates `date` and optional `locationId`, `spouse1Id`, `spouse2Id` exist.
- **PUT /weddings/:id**: update wedding (requires auth). Validates provided FKs.
- **DELETE /weddings/:id**: delete wedding (requires `ADMIN` or `SUPPORT`).

Tasks API
- **Overview**: Task CRUD with wedding association and optional user assignee/completer.
- **GET /tasks**: list tasks. Supports `status`, `assignedTo`, `weddingId`, `limit`, `offset`.
- **GET /tasks/:id**: fetch single task.
- **POST /tasks**: create task (requires auth). Validates required fields and `weddingId` FK.
- **PUT /tasks/:id**: update task (requires auth). Validates `assignedToId` and `completedById` FKs when provided.
- **DELETE /tasks/:id**: delete task (requires `ADMIN` or `SUPPORT`).

Authentication & Middleware
- **POST /auth/login**: authenticate with `email` and `password`. Sets an `httpOnly` session cookie named `token` (no `maxAge` set by default) and also returns a `token` and `user` object in the JSON response for development convenience.
- **POST /auth/logout**: clears the `token` cookie on the client. Call this to sign users out and remove the cookie.
- **GET /auth/me**: returns the current authenticated user. Authentication is accepted via the `token` cookie or `Authorization: Bearer <token>` header.
- **POST /auth/request-reset**: development helper returning a short-lived reset link (in production this should send email).
- **POST /auth/reset**: accepts `token` and `newPassword` to reset password after token verification.
- **requireAuth middleware**: applied to protected endpoints (writes and sensitive reads). It validates the JWT from either the cookie or the Authorization header.
- **requireRole middleware**: `requireRole(['ADMIN','SUPPORT'])` is used where endpoints should be restricted to admin/support roles.

FK Validation & Error Handling
- All POST/PUT handlers that accept foreign keys validate the referenced resource exists using `ensureExistsOrRespond` helper. Missing FKs result in `400` with a clear error field message.
- Prisma errors are centrally handled by `handlePrismaError`, mapping common Prisma error codes to HTTP responses (e.g., unique constraint -> 409).

Client Deletion Business Rule
- Deleting a client is blocked when there are future weddings where the client is listed as `spouse1` or `spouse2`. Attempting to delete in that case returns `400` with an explanatory message.

Developer Notes
- A smoke test script was added at `server/test/run_api_tests.js` that starts the app in-process and exercises the main endpoints (creates address → client → vendor → wedding → task sequence and then cleans up). This is run locally to verify the flow.

Security & Next Steps
- Passwords are hashed with bcrypt on create/update.
- The server issues an `httpOnly` session cookie for authentication. The client must include credentials on requests (fetch with `credentials: 'include'`) to use cookie-based auth. The client no longer stores tokens in `localStorage` by default.

