# Backend Developer Guide

This document outlines the structure, architecture, routing, and features of the Express.js + Prisma backend application.

---

## Project Overview

The backend is a Node.js + Express server with Prisma ORM for PostgreSQL database interaction. It provides RESTful API endpoints for the wedding planning application with authentication, authorization, validation, and complex templating features.

**Location**: `/server`  
**Main Entry**: `server.js`  
**Port**: 3000 (default, configurable)

---

## Directory Structure

```
server/
├── server.js                  # Express app setup and startup
├── prismaClient.js            # Prisma client singleton
├── utils.js                   # General utility functions
├── seed.js                    # Database seeding script
├── testsendgrid.js            # SendGrid integration testing
├── readme.md                  # Server-specific documentation
├── notes.md                   # Development notes
│
├── middleware/                # Express middleware
│   ├── requireAuth.js         # Authentication verification
│   └── requireRole.js         # Role-based authorization
│
├── routes/                    # API endpoint handlers (~11 route files)
│   ├── auth.js               # Authentication endpoints (login, register, etc.)
│   ├── users.js              # User management endpoints
│   ├── clients.js            # Client (couple) management
│   ├── vendors.js            # Vendor management
│   ├── address.js            # Address management
│   ├── tasks.js              # Task CRUD and management
│   ├── weddings.js           # Wedding management
│   ├── weddingTemplates.js   # Wedding template endpoints
│   ├── templateCategories.js # Template category endpoints
│   ├── templateTasks.js      # Template task endpoints
│   ├── taskCategories.js     # Task category endpoints
│   └── ...
│
├── validators/               # Input validation schemas
│   ├── validateBase.js       # Base validation utilities
│   ├── validateWithSchema.js # Zod schema validation
│   ├── validateAddress.js
│   ├── validateClient.js
│   ├── validateUsers.js
│   ├── validateVendor.js
│   ├── validateTaskCategory.js
│   ├── validateTemplateCategory.js
│   ├── validateTemplateTask.js
│   ├── validateWeddingTemplate.js
│   └── ...
│
├── utils/                    # Business logic utilities
│   └── instantiateWeddingTemplate.js  # Template instantiation logic
│
├── templates/                # Wedding template management
│   ├── weddingPlanningTemplate.js     # Template structure definition
│   ├── parseTemplateFromCSV.js        # CSV parser for templates
│   ├── seed-template.js               # Template seeding
│   └── onboarding+planning+finalization.csv  # Default template
│
├── test/                     # Testing suite
│   ├── run_api_tests.js      # Main test runner
│   ├── validation_tests.js   # Validation tests
│   ├── vendor_tests.js       # Vendor endpoint tests
│   ├── wedding_date_update_tests.js  # Wedding date tests
│   └── ...
│
├── prisma/                   # Database schema and migrations
│   ├── schema.prisma         # Prisma data model
│   ├── readme.md             # Prisma documentation
│   └── migrations/           # Database migration history
│
├── .env                      # Environment variables (not in repo)
├── package.json              # Dependencies and scripts
└── .gitignore               # Version control ignore rules
```

---

## Core Files

### server.js
Main Express application setup:
- CORS configuration (accepts frontend origin)
- Middleware setup (JSON parsing, cookies, CORS)
- Route mounting for all API endpoints
- Root endpoint (`/`) with comprehensive documentation
- Health check endpoint (`/healthz`)

**Key Middleware**:
```javascript
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
```

### prismaClient.js
Singleton instance of Prisma Client for reuse across the application.

### utils.js
General utility functions used across routes and business logic.

---

## API Routes

### Authentication Routes (`/auth`)
- `POST /auth/register` — Register new user with email/password
- `POST /auth/login` — Login user, returns JWT token
- `POST /auth/logout` — Logout user
- `POST /auth/verify-email` — Verify email with token
- `POST /auth/request-password-reset` — Send password reset email
- `POST /auth/reset-password` — Complete password reset

### User Routes (`/users`)
- `GET /users` — List all users (admin only)
- `POST /users` — Create user
- `GET /users/:id` — Get user by ID
- `PUT /users/:id` — Update user
- `DELETE /users/:id` — Delete user
- Role-based filtering and management

### Client Routes (`/clients`)
- `GET /clients` — List all clients
- `POST /clients` — Create new client (couple)
- `GET /clients/:id` — Get client details
- `PUT /clients/:id` — Update client
- `DELETE /clients/:id` — Delete client
- Returns related wedding information

### Wedding Routes (`/weddings`)
- `GET /weddings` — List weddings (filtered by user role)
- `POST /weddings` — Create new wedding
- `GET /weddings/:id` — Get wedding details with all related data
- `PUT /weddings/:id` — Update wedding (date, location, spouses)
- `DELETE /weddings/:id` — Delete wedding and cascade
- **Special**: Update wedding date triggers task recalculation

### Task Routes (`/tasks`)
- `GET /tasks` — List tasks (filtered by wedding/assignee)
- `POST /tasks` — Create task
- `GET /tasks/:id` — Get task details
- `PUT /tasks/:id` — Update task (status, assignee, dates, etc.)
- `DELETE /tasks/:id` — Delete task
- Handles task dependencies and couple task assignments

### Vendor Routes (`/vendors`)
- `GET /vendors` — List vendors
- `POST /vendors` — Create vendor
- `GET /vendors/:id` — Get vendor details with tags
- `PUT /vendors/:id` — Update vendor
- `DELETE /vendors/:id` — Delete vendor
- Manage vendor tags and ratings

### Address Routes (`/address`)
- `GET /address` — List addresses
- `POST /address` — Create address
- `GET /address/:id` — Get address details
- `PUT /address/:id` — Update address
- `DELETE /address/:id` — Delete address
- Types: Venue, Vendor, Client

### Wedding Template Routes (`/wedding-templates`)
- `GET /wedding-templates` — List available templates
- `POST /wedding-templates` — Create template
- `GET /wedding-templates/:id` — Get template with categories and tasks

### Template Category Routes (`/template-categories`)
- `GET /template-categories` — List categories
- `POST /template-categories` — Create category
- `PUT /template-categories/:id` — Update category
- Organize tasks within templates

### Template Task Routes (`/template-tasks`)
- `GET /template-tasks` — List template tasks
- `POST /template-tasks` — Create template task with dependencies
- `PUT /template-tasks/:id` — Update task
- Manage task dependencies at template level

### Task Category Routes (`/task-categories`)
- `GET /task-categories` — List task categories for a wedding
- `POST /task-categories` — Create category
- `PUT /task-categories/:id` — Update category
- Organize actual wedding tasks

---

## Middleware

### requireAuth.js
- Verifies JWT token from cookies/headers
- Attaches user information to `req.user`
- Returns 401 if token missing or invalid
- Used on protected routes

### requireRole.js
- Checks if user has required role (ADMIN, PLANNER, USER, CLIENT)
- Works in conjunction with `requireAuth`
- Returns 403 if user lacks authorization
- Usage: `router.get('/admin-only', requireRole('ADMIN'), handler)`

---

## Validation

### Validators Directory
Each entity has a dedicated validator using Zod schema validation:

**validateBase.js**
- Common validation utilities
- Error formatting and response handling

**validateWithSchema.js**
- Zod schema validation helper
- Type-safe request body validation

**Entity Validators**:
- `validateAddress.js` — Address schema
- `validateClient.js` — Client/couple schema
- `validateUsers.js` — User and role validation
- `validateVendor.js` — Vendor schema
- `validateTaskCategory.js` — Task category schema
- `validateTemplateCategory.js` — Template category schema
- `validateTemplateTask.js` — Template task schema
- `validateWeddingTemplate.js` — Wedding template schema

**Validation Pattern**:
```javascript
const { error, data } = validateAddress(req.body);
if (error) return res.status(400).json({ error: error.message });
// Use validated data
```

---

## Templating Features

### Wedding Planning Templates

A critical feature is the ability to create reusable wedding planning templates that define the standard workflow for wedding planning.

#### Template Structure
**weddingPlanningTemplate.js** defines:
- Categories (phases of planning: Onboarding, Planning, Finalization)
- Tasks within each category
- Task dependencies (what must complete before next task starts)
- Default durations and priorities
- Task types (planner tasks vs. couple tasks)

#### Template Creation from CSV
**parseTemplateFromCSV.js**:
- Parses wedding planning templates from CSV format
- CSV located at `templates/onboarding+planning+finalization.csv`
- Transforms CSV data to Prisma schema format
- Runs database migration automatically

#### Template Instantiation
**instantiateWeddingTemplate.js**:
- Converts template to actual tasks for a specific wedding
- Calculates due dates based on wedding date and task offsets
- Creates task dependencies in actual wedding
- Runs when creating wedding from template
- Assigns tasks to couple and/or planner based on template config

#### Default Template
**onboarding+planning+finalization.csv**:
- CSV file containing standard wedding planning workflow
- Three main phases: Onboarding, Planning, Finalization
- Can be customized and reloaded using `npm run generate-template`

---

## Testing Suite

### Test Files Location
`/server/test/` — Automated API testing for development and validation

### Available Tests

**run_api_tests.js**
- Main test runner
- Orchestrates all test suites
- Use: `node test/run_api_tests.js`

**validation_tests.js**
- Tests endpoint input validation
- Verifies error handling for invalid data
- Ensures validators are working correctly

**vendor_tests.js**
- Tests vendor CRUD operations
- Vendor tag management
- Vendor-wedding associations

**wedding_date_update_tests.js**
- Tests date update functionality
- Verifies task recalculation on date changes
- Ensures dependencies update correctly

### Running Tests
```bash
cd server
node test/run_api_tests.js          # Run all tests
node test/validation_tests.js        # Run validation only
node test/vendor_tests.js            # Run vendor tests
node test/wedding_date_update_tests.js  # Run wedding date tests
```

---

## Database Operations

### Prisma Migrations
```bash
# Create migration after schema changes
prisma migrate dev --name descriptive_name

# Reset database (dev only, data loss!)
prisma migrate reset

# Check migration status
prisma migrate status

# Apply pending migrations
prisma migrate resolve
```

### Prisma Studio
Visual database editor:
```bash
npx prisma studio
```

### Seeding Database
```bash
# Run seed.js script
node seed.js <arg> #arg should be email address desired for initial admin account

# Or as part of migrations
prisma migrate dev
```

---

## Authentication & Authorization

### JWT Flow
1. User logs in with email/password
2. Server validates credentials against bcrypt-hashed password
3. JWT token generated and sent in HTTP-only cookie
4. Subsequent requests include token in Cookie header
5. `requireAuth` middleware verifies token and extracts user

### Roles
- **ADMIN** — Full system access, manage users and templates
- **PLANNER** — Manage weddings and tasks
- **SUPPORT** — Support team access
- **CLIENT** — Couple/client access, view own wedding

### Password Security
- Bcrypt hashing with salting (bcrypt v6.0.0)
- Password reset tokens with expiration
- Email verification before account activation

---

## Email & Communication

### SendGrid Integration
- `@sendgrid/mail` ^8.1.6 for email sending
- Configured via `SENDGRID_API_KEY` environment variable

### Flows
- Welcome email on registration
- Email verification link
- Password reset email with token link
- Wedding-related notifications (optional)

### Testing
```bash
node testsendgrid.js  # Test SendGrid configuration
```

---

## Error Handling

### Standard Response Format
```javascript
// Success
res.json({ success: true, data: {...} })

// Error
res.status(400).json({ error: 'Description', details: {...} })
```

### HTTP Status Codes
- `200` — Success
- `201` — Created
- `400` — Bad Request (validation error)
- `401` — Unauthorized (not authenticated)
- `403` — Forbidden (insufficient permission)
- `404` — Not Found
- `409` — Conflict (duplicate, constraint violation)
- `500` — Server Error

---

## Development Workflow

### Running Backend
```bash
cd server
npm install              # First time setup
npm run dev              # Start with nodemon (watches for changes)
npm start                # Run without nodemon
```

### Environment Setup
Create `.env` file in `/server`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/wedding_planning
CLIENT_URL=http://localhost:5173
JWT_SECRET=your-secret-key-min-32-chars
SENDGRID_API_KEY=SG.xxxxx
```

### API Testing
- Use Postman, Insomnia, or curl for manual testing
- Automated tests in `/test/` directory
- Frontend integration tests verify API behavior

### Common Debugging
- Check server logs in terminal
- Use `console.log` for quick debugging
- Prisma Studio for database inspection
- Network tab in browser DevTools for API calls

---

## Performance Considerations

1. **Database Indexing** — Prisma schema includes strategic `@@index` directives
2. **Query Optimization** — Avoid N+1 queries, use `select` to limit fields
3. **Pagination** — Implement for large result sets
4. **Caching** — Consider Redis for frequently accessed data (not implemented)
5. **Connection Pooling** — Prisma handles via connection string

---

## Security Best Practices

1. **Input Validation** — All endpoints validate using Zod schemas
2. **Authentication** — JWT tokens required on protected routes
3. **Authorization** — Role-based access control via middleware
4. **CORS** — Restricted to frontend origin
5. **Environment Variables** — Secrets not in code
6. **SQL Injection** — Prevented by Prisma's parameterized queries
7. **Password Hashing** — Bcrypt with salt rounds

---

## Further Documentation

- [TECH_STACK.md](TECH_STACK.md) — Full tech stack details
- [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md) — Frontend architecture
- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) — Database schema reference
- `prisma/readme.md` — Prisma-specific documentation
- `readme.md` (in server directory) — Additional server notes
