# Database Schema Documentation

Complete documentation of the PostgreSQL database schema used in the Senior Design Wedding Planning Project.

---

## Database Overview

**Database**: PostgreSQL  
**ORM**: Prisma 6.18.0+  
**Schema File**: `server/prisma/schema.prisma`  
**Migrations**: Managed in `server/prisma/migrations/`

---

## Enums

### Role
User roles for access control and permissions:
- `ADMIN` — Full system access
- `USER` — General planner/staff user
- `SUPPORT` — Support team
- `CLIENT` — Couple/client (read-only access to own wedding)

### Status
Task completion status:
- `PENDING` — Not started
- `IN_PROGRESS` — Currently being worked on
- `BLOCKED` — Cannot proceed (dependency not met)
- `COMPLETED` — Finished
- `CANCELLED` — Cancelled/not applicable

### TaskType
Distinguishes between planner-assigned and couple-assigned tasks:
- `Task` — Planner task (assigned to planner)
- `CoupleTask` — Couple task (assigned to couple members)

### AddressType
Categorizes addresses by usage:
- `Venue` — Wedding venue address
- `Vendor` — Vendor location address
- `Client` — Client/couple address

---

## Core Models

### User

Represents system users (planners, admins, support staff, clients).

```prisma
model User {
  id        String   @id @default(uuid())
  name      String
  email     String   @unique
  phone     String?
  password  String   (bcrypt-hashed)
  role      Role
  createdAt DateTime @default(now())
  
  // Email verification
  emailVerified         Boolean   @default(false)
  emailVerificationToken String?   @unique
  emailVerificationExpires DateTime?
  
  // Password reset
  passwordResetToken     String?   @unique
  passwordResetExpires   DateTime?

  // Relations
  tasksAssigned   Task[] @relation("TasksAssigned")
  tasksCompleted  Task[] @relation("TasksCompleted")
  planningWeddings PlannerWedding[]
  coupleTasksAssigned CoupleTask[] @relation("TasksAssignedToCouple")
}
```

**Fields**:
- `id` — UUID primary key
- `name` — User's full name
- `email` — Unique email address
- `phone` — Phone number (optional)
- `password` — Bcrypt-hashed password
- `role` — One of: ADMIN, USER, SUPPORT, CLIENT
- `emailVerified` — Has email been verified?
- `emailVerificationToken` — Temporary verification token
- `emailVerificationExpires` — When verification token expires
- `passwordResetToken` — Temporary password reset token
- `passwordResetExpires` — When password reset token expires

**Relations**:
- Tasks assigned to this user
- Tasks completed by this user
- Weddings as assigned planner(s)
- Couple tasks assigned to this user

---

### Client

Represents a couple or individuals planning a wedding.

```prisma
model Client {
  id        String   @id @default(uuid())
  name      String
  email     String?
  phone     String?
  notes     String?
  createdAt DateTime @default(now())

  weddingsAsSpouse1 Wedding[] @relation("Spouse1")
  weddingsAsSpouse2 Wedding[] @relation("Spouse2")
}
```

**Fields**:
- `id` — UUID primary key
- `name` — Couple name or individual name
- `email` — Email address (optional)
- `phone` — Phone number (optional)
- `notes` — Any notes about the couple (optional)
- `createdAt` — When record created

**Relations**:
- Weddings where this client is spouse 1
- Weddings where this client is spouse 2

---

### Wedding

Represents a wedding event and central project entity.

```prisma
model Wedding {
  id          String   @id @default(uuid())
  date        DateTime
  createdAt   DateTime @default(now())

  template     WeddingTemplate? @relation(fields: [templateId], references: [id])
  templateId   String?

  location    Address? @relation(fields: [locationId], references: [id], onDelete: SetNull)
  locationId  String?

  spouse1     Client?  @relation("Spouse1", fields: [spouse1Id], references: [id], onDelete: SetNull)
  spouse1Id   String?
  spouse2     Client?  @relation("Spouse2", fields: [spouse2Id], references: [id], onDelete: SetNull)
  spouse2Id   String?

  planners    PlannerWedding[]
  vendors     WeddingVendor[]
  categories  TaskCategory[]
}
```

**Fields**:
- `id` — UUID primary key
- `date` — Wedding date and time
- `templateId` — Reference to template used (if created from template)
- `locationId` — Venue address
- `spouse1Id` — First spouse/partner (Client)
- `spouse2Id` — Second spouse/partner (Client)
- `createdAt` — When wedding created

**Relations**:
- Template used to generate tasks
- Venue location (Address)
- Spouses (Clients)
- Assigned planners (via PlannerWedding junction)
- Associated vendors (via WeddingVendor junction)
- Task categories for this wedding

**Cascade Delete**: Deleting a wedding cascades to:
- All task categories
- All tasks in those categories
- All task dependencies
- All couple tasks

---

### Address

Represents physical addresses for venues, vendors, and clients.

```prisma
model Address {
  id     String   @id @default(uuid())
  street String
  city   String
  state  String
  zip    String
  type   AddressType @default(Venue)

  weddings Wedding[]
  vendors  Vendor[]
}
```

**Fields**:
- `id` — UUID primary key
- `street` — Street address
- `city` — City
- `state` — State/province
- `zip` — ZIP/postal code
- `type` — AddressType enum (Venue, Vendor, Client)

**Relations**:
- Weddings using this as venue
- Vendors at this address

---

## Task Management Models

### TaskCategory

Organizes tasks within a wedding into logical groups (e.g., "Planning", "Coordination").

```prisma
model TaskCategory {
  id        String   @id @default(uuid())
  name      String
  sortOrder Int

  wedding   Wedding  @relation(fields: [weddingId], references: [id], onDelete: Cascade)
  weddingId String

  tasks     Task[]
  dependencies TaskDependency[] @relation("TaskCategoryDependencies")
}
```

**Fields**:
- `id` — UUID primary key
- `name` — Category name
- `sortOrder` — Display order
- `weddingId` — Parent wedding

**Relations**:
- All tasks in category
- Dependencies on this category from other tasks

---

### Task

Represents an individual task within a wedding.

```prisma
model Task {
  id          String   @id @default(uuid())
  name        String
  description String?
  priority    Int
  dueDate     DateTime
  sortOrder   Int
  createdAt   DateTime @default(now())

  currentStatus Status @default(PENDING)

  assignedTo   User?   @relation("TasksAssigned", fields: [assignedToId], references: [id])
  assignedToId String?
  
  assignToCouple Boolean @default(false)
  coupleTasks    CoupleTask[]

  completedOn  DateTime?
  completedBy  User?   @relation("TasksCompleted", fields: [completedById], references: [id])
  completedById String?

  notes       String?

  category    TaskCategory @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  categoryId  String

  dependencies   TaskDependency[] @relation("TaskDependencies")
  dependedOnBy   TaskDependency[] @relation("TaskDependedOnBy")

  templateTask   TemplateTask? @relation("TemplateTaskGenerated", fields: [templateTaskId], references: [id])
  templateTaskId String?
}
```

**Fields**:
- `id` — UUID primary key
- `name` — Task name/title
- `description` — Detailed task description (optional)
- `priority` — Numeric priority (typically 1-5)
- `dueDate` — When task is due
- `sortOrder` — Display order within category
- `currentStatus` — Current Status enum value
- `assignedToId` — User assigned to task (optional)
- `assignToCouple` — Should also be assigned to couple? Boolean flag
- `completedOn` — When task was completed (optional)
- `completedById` — User who completed task (optional)
- `notes` — Task notes (optional)
- `categoryId` — Parent category
- `templateTaskId` — Track which template task generated this

**Relations**:
- Assigned to user
- Completed by user
- Parent task category
- Couple tasks (if assignToCouple = true)
- Task dependencies (this task depends on these)
- Dependent tasks (these tasks depend on this)
- Source template task

---

### TaskDependency

Junction table establishing dependencies between tasks and/or task categories.
A task can depend on other tasks OR task categories being completed first.

```prisma
model TaskDependency {
  id          String   @id @default(uuid())

  task        Task     @relation("TaskDependencies", fields: [taskId], references: [id], onDelete: Cascade)
  taskId      String

  dependsOnTask   Task?    @relation("TaskDependedOnBy", fields: [dependsOnTaskId], references: [id], onDelete: Cascade)
  dependsOnTaskId String?

  dependsOnCategory   TaskCategory? @relation("TaskCategoryDependencies", fields: [dependsOnCategoryId], references: [id], onDelete: Cascade)
  dependsOnCategoryId String?

  createdAt   DateTime @default(now())

  @@unique([taskId, dependsOnTaskId, dependsOnCategoryId])
  @@index([taskId])
  @@index([dependsOnTaskId])
  @@index([dependsOnCategoryId])
}
```

**Fields**:
- `id` — UUID primary key
- `taskId` — Task that has the dependency
- `dependsOnTaskId` — Task it depends on (nullable)
- `dependsOnCategoryId` — Category it depends on (nullable)
- `createdAt` — When dependency created

**Constraints**:
- Unique constraint: task + dependsOnTaskId + dependsOnCategoryId
- Ensures a task doesn't depend on the same thing multiple times

---

### CoupleTask

Junction table linking tasks to couple members for couple-managed tasks.

```prisma
model CoupleTask {
  id        String   @id @default(uuid())
  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  taskId    String
  
  assignedTo User   @relation("TasksAssignedToCouple", fields: [assignedToId], references: [id], onDelete: Cascade)
  assignedToId String
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([taskId, assignedToId])
  @@index([taskId])
  @@index([assignedToId])
}
```

**Fields**:
- `id` — UUID primary key
- `taskId` — Task assigned to couple
- `assignedToId` — User (couple member) assigned
- `createdAt` — When assigned
- `updatedAt` — Last updated

**Constraints**:
- Unique: A user can only be assigned once per task
- Cascade delete: Deleting the task removes couple assignment

---

## Template Models

Wedding templates define reusable workflows for standardized wedding planning processes.

### WeddingTemplate

Template for an entire wedding planning workflow.

```prisma
model WeddingTemplate {
  id        String   @id @default(uuid())
  name      String
  version   Int
  createdAt DateTime @default(now())

  categories TemplateCategory[]
  weddings   Wedding[]

  @@unique([name, version])
}
```

**Fields**:
- `id` — UUID primary key
- `name` — Template name (e.g., "Standard Wedding")
- `version` — Version number for template updates
- `createdAt` — When created

**Constraints**:
- Unique: name + version combination ensures versioning

**Relations**:
- Template categories
- Weddings created from this template

---

### TemplateCategory

Groups template tasks into logical phases (e.g., "Onboarding", "Planning", "Finalization").

```prisma
model TemplateCategory {
  id         String   @id @default(uuid())
  name       String
  sortOrder  Int

  template   WeddingTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  templateId String

  tasks      TemplateTask[]
  dependencies TemplateTaskDependency[] @relation("TemplateCategoryDependencies")
}
```

**Fields**:
- `id` — UUID primary key
- `name` — Category name
- `sortOrder` — Display order
- `templateId` — Parent template

**Relations**:
- Template tasks in this category
- Dependencies on this category

---

### TemplateTask

Individual task within a template (blueprint for actual tasks).

```prisma
model TemplateTask {
  id                   String   @id @default(uuid())
  name                 String
  description          String?
  taskType             TaskType @default(Task)
  dependencyMetadata   String?
  defaultPriority      Int
  defaultDueOffsetDays Int
  sortOrder            Int
  createdAt            DateTime @default(now())

  category   TemplateCategory @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  categoryId String

  dependencies   TemplateTaskDependency[] @relation("TemplateTaskDependencies")
  dependedOnBy   TemplateTaskDependency[] @relation("TemplateTaskDependedOnBy")

  generatedTasks Task[] @relation("TemplateTaskGenerated")
}
```

**Fields**:
- `id` — UUID primary key
- `name` — Task name
- `description` — Task description (optional)
- `taskType` — Task or CoupleTask
- `dependencyMetadata` — JSON metadata about dependencies (optional)
- `defaultPriority` — Default priority value
- `defaultDueOffsetDays` — Days from wedding date (e.g., -30 = 30 days before)
- `sortOrder` — Display order
- `categoryId` — Parent category

**Relations**:
- Category this belongs to
- Template task dependencies
- Actual tasks generated from this template

---

### TemplateTaskDependency

Establishes dependencies between template tasks, defining workflow structure.

```prisma
model TemplateTaskDependency {
  id          String   @id @default(uuid())

  task        TemplateTask @relation("TemplateTaskDependencies", fields: [taskId], references: [id], onDelete: Cascade)
  taskId      String

  dependsOnTask   TemplateTask?  @relation("TemplateTaskDependedOnBy", fields: [dependsOnTaskId], references: [id], onDelete: Cascade)
  dependsOnTaskId String?

  dependsOnCategory   TemplateCategory? @relation("TemplateCategoryDependencies", fields: [dependsOnCategoryId], references: [id], onDelete: Cascade)
  dependsOnCategoryId String?

  createdAt   DateTime @default(now())

  @@unique([taskId, dependsOnTaskId, dependsOnCategoryId])
  @@index([taskId])
  @@index([dependsOnTaskId])
  @@index([dependsOnCategoryId])
}
```

**Fields**:
- `id` — UUID primary key
- `taskId` — Task that has dependency
- `dependsOnTaskId` — Template task it depends on (nullable)
- `dependsOnCategoryId` — Template category it depends on (nullable)
- `createdAt` — When created

---

## Vendor & Wedding Association Models

### Vendor

Represents an external vendor (caterer, photographer, florist, etc.).

```prisma
model Vendor {
  id        String   @id @default(uuid())
  name      String
  email     String?
  phone     String?
  rating    Int
  notes     String?

  address   Address? @relation(fields: [addressId], references: [id], onDelete: SetNull)
  addressId String?

  weddings  WeddingVendor[]
  tags      VendorTag[]
}
```

**Fields**:
- `id` — UUID primary key
- `name` — Vendor name
- `email` — Contact email (optional)
- `phone` — Contact phone (optional)
- `rating` — Rating (typically 0-5)
- `notes` — Additional notes (optional)
- `addressId` — Vendor location address

**Relations**:
- Address location
- Wedding associations (via WeddingVendor)
- Tags for categorization (via VendorTag)

---

### WeddingVendor

Junction table associating vendors with specific weddings.

```prisma
model WeddingVendor {
  wedding   Wedding @relation(fields: [weddingId], references: [id], onDelete: Cascade)
  weddingId String

  vendor   Vendor @relation(fields: [vendorId], references: [id], onDelete: Cascade)
  vendorId String

  rating    Int      @default(0)
  notes     String?
  assignedAt DateTime @default(now())

  @@id([weddingId, vendorId])
}
```

**Fields**:
- `weddingId` — Wedding (part of composite key)
- `vendorId` — Vendor (part of composite key)
- `rating` — Wedding-specific vendor rating
- `notes` — Notes about vendor for this wedding
- `assignedAt` — When vendor assigned to wedding

**Composite Key**: weddingId + vendorId ensures single entry per wedding-vendor pair

---

### Tag

Vendor tag for categorization (e.g., "Photographer", "Caterer", "Florist").

```prisma
model Tag {
  id      String   @id @default(uuid())
  name    String   @unique
  vendors VendorTag[]
}
```

**Fields**:
- `id` — UUID primary key
- `name` — Tag name (unique)

**Relations**:
- Vendor tags assigned this tag

---

### VendorTag

Junction table for many-to-many vendor-tag relationship.

```prisma
model VendorTag {
  vendor   Vendor @relation(fields: [vendorId], references: [id])
  vendorId String

  tag      Tag    @relation(fields: [tagId], references: [id])
  tagId    String

  @@id([vendorId, tagId])
}
```

**Fields**:
- `vendorId` — Vendor (part of composite key)
- `tagId` — Tag (part of composite key)

---

## Staff & Association Models

### PlannerWedding

Junction table associating planners (users) with weddings.

```prisma
model PlannerWedding {
  planner   User    @relation(fields: [plannerId], references: [id], onDelete: Cascade)
  plannerId String

  wedding   Wedding @relation(fields: [weddingId], references: [id], onDelete: Cascade)
  weddingId String

  assignedAt DateTime @default(now())

  @@id([plannerId, weddingId])
}
```

**Fields**:
- `plannerId` — Planner user (part of composite key)
- `weddingId` — Wedding (part of composite key)
- `assignedAt` — When planner assigned to wedding

**Composite Key**: plannerId + weddingId ensures single entry per planner-wedding pair

---

## Database Relationships Diagram

```
User
├── tasksAssigned (Task)
├── tasksCompleted (Task)
├── planningWeddings (PlannerWedding)
└── coupleTasksAssigned (CoupleTask)

Client
├── weddingsAsSpouse1 (Wedding)
└── weddingsAsSpouse2 (Wedding)

Wedding
├── template (WeddingTemplate)
├── location (Address)
├── spouse1, spouse2 (Client)
├── planners (PlannerWedding)
├── vendors (WeddingVendor)
└── categories (TaskCategory)

TaskCategory
├── wedding (Wedding)
├── tasks (Task)
└── dependencies (TaskDependency)

Task
├── assignedTo (User)
├── completedBy (User)
├── category (TaskCategory)
├── dependencies (TaskDependency)
├── dependedOnBy (TaskDependency)
├── coupleTasks (CoupleTask)
└── templateTask (TemplateTask)

Vendor
├── address (Address)
├── weddings (WeddingVendor)
└── tags (VendorTag)

Address
├── weddings (Wedding)
└── vendors (Vendor)
```

---

## Indexes and Performance

Strategic indexes are defined for optimized queries:

- TaskDependency: `@@index([taskId], [dependsOnTaskId], [dependsOnCategoryId])`
- TemplateTaskDependency: Similar indexing for template dependencies
- CoupleTask: `@@index([taskId], [assignedToId])`

These ensure dependency lookups and filtering by assignee are fast.

---

## Migration Management

Database migrations are version controlled in `server/prisma/migrations/`

Each migration:
1. Is timestamped and named descriptively
2. Contains `up` and `down` migrations
3. Is applied in order to maintain schema consistency

**Common Migration Commands**:
```bash
prisma migrate dev --name migration_name    # Create and apply
prisma migrate reset                         # Reset database (dev only)
prisma migrate status                        # Check migration status
```

---

## Further Documentation

- [TECH_STACK.md](TECH_STACK.md) — Technology versions
- [BACKEND_GUIDE.md](BACKEND_GUIDE.md) — API endpoints and routes
- [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md) — Frontend architecture
- `server/prisma/readme.md` — Prisma-specific documentation
