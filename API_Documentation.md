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
- Clients API
- Vendors API
- Weddings API
- Tasks API