# Frontend Developer Guide

This document outlines the structure, architecture, and conventions used in the React + TypeScript frontend application.

---

## Project Overview

The frontend is a React 19 + TypeScript + Vite application styled with Tailwind CSS. It uses React Router for client-side navigation and provides a responsive UI for managing wedding planning tasks.

**Location**: `/client`  
**Main Entry**: `src/main.tsx`  
**Root Component**: `src/App.tsx`

---

## Directory Structure

```
client/
├── public/                 # Static assets (served as-is)
├── src/
│   ├── main.tsx           # Application entry point
│   ├── App.tsx            # Root component with routing
│   ├── index.css          # Global styles
│   ├── global.d.ts        # Global type definitions
│   ├── vite-env.d.ts      # Vite environment type definitions
│   │
│   ├── components/        # Reusable React components
│   │   ├── ui/            # Base UI components (buttons, inputs, etc.)
│   │   ├── Header.tsx
│   │   ├── Layout.tsx
│   │   ├── CreateWeddingForm.tsx
│   │   ├── WeddingList.tsx
│   │   ├── WeddingDetailsEditor.tsx
│   │   ├── TaskEditor.tsx
│   │   ├── CoupleTaskEditor.tsx
│   │   ├── VendorEditor.tsx
│   │   ├── VenueEditor.tsx
│   │   ├── AddressSelector.tsx
│   │   ├── ClientSelector.tsx
│   │   ├── CouplemembersEditor.tsx
│   │   ├── PlannerAssignment.tsx
│   │   └── ...
│   │
│   ├── pages/             # Page-level components (full screens)
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── VerifyEmail.tsx
│   │   ├── ResetPassword.tsx
│   │   ├── ClientDashboard.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── PlannerManagement.tsx
│   │   ├── PlannerOverview.tsx
│   │   ├── PlannerWorkspace.tsx
│   │   ├── PlannerTasks.tsx
│   │   ├── AssignedWeddings.tsx
│   │   ├── PlanningDashboard.tsx
│   │   ├── CreateWedding.tsx
│   │   ├── WeddingManagement.tsx
│   │   ├── Users.tsx
│   │   ├── Vendors.tsx
│   │   └── ...
│   │
│   ├── hooks/             # Custom React hooks
│   │
│   ├── lib/               # Utility functions and helpers
│   │   ├── api.ts         # API client for backend communication
│   │   └── utils.ts       # General utility functions
│   │
│   ├── utils/             # Additional utilities
│   │
│   └── assets/            # Images, fonts, and other static resources
│
├── index.html             # HTML template (Vite entry point)
├── vite.config.ts         # Vite configuration
├── tsconfig.json          # Main TypeScript configuration
├── tsconfig.app.json      # App-specific TypeScript settings
├── tsconfig.node.json     # Build tool TypeScript settings
├── tailwind.config.js     # Tailwind CSS configuration
├── postcss.config.cjs     # PostCSS configuration
├── eslint.config.js       # ESLint configuration
└── package.json           # Dependencies and scripts
```

---

## Key Components

### Layout Components

**Layout.tsx**
- Wraps page content with header and navigation
- Provides consistent page structure across the app

**Header.tsx**
- Navigation bar with menu items
- User information and logout functionality
- Responsive mobile navigation

### Page Components

#### Authentication Pages
- **Login.tsx** — User login form with JWT-based authentication
- **Register.tsx** — New user registration
- **VerifyEmail.tsx** — Email verification flow
- **ResetPassword.tsx** — Password reset functionality

#### User Role-Based Pages
- **ClientDashboard.tsx** — View for clients (couples planning weddings)
- **AdminDashboard.tsx** — Administrative panel for system management
- **PlannerManagement.tsx** — Planner assignment and management
- **PlannerOverview.tsx** — Overview of assigned weddings
- **PlannerWorkspace.tsx** — Main planner workspace
- **PlannerTasks.tsx** — Task management for planners
- **AssignedWeddings.tsx** — View of assigned wedding projects
- **PlanningDashboard.tsx** — Main planning interface
- **Users.tsx** — User management page
- **Vendors.tsx** — Vendor management page

#### Wedding Management
- **CreateWedding.tsx** — Create new wedding project
- **WeddingManagement.tsx** — Manage selected wedding

### Feature Components

**CreateWeddingForm.tsx**
- Form for creating new wedding entries
- Captures couple information and wedding date

**WeddingList.tsx**
- Displays list of weddings with filtering/sorting
- Navigation to individual wedding details

**WeddingDetailsEditor.tsx**
- Edit wedding information (date, venue, location)
- Displays couple information

**TaskEditor.tsx**
- Create, edit, and manage tasks
- Set priority, due date, assignee
- Handle task dependencies

**CoupleTaskEditor.tsx**
- Assign tasks to couples (not just planners)
- Manage couple-specific task assignments

**VendorEditor.tsx**
- Add/edit vendor information
- Manage vendor ratings and notes
- Vendor categorization with tags

**VenueEditor.tsx**
- Create/edit venue information
- Address management

**AddressSelector.tsx**
- Reusable component for selecting addresses
- Used in venue and vendor editors

**ClientSelector.tsx**
- Reusable component for selecting clients
- Dropdown or search-based selection

**CouplemembersEditor.tsx**
- Manage couple member information
- Edit spouse/partner details

**PlannerAssignment.tsx**
- Assign planners to weddings
- Manage planner workload

### UI Components (Base Library)

Located in `src/components/ui/`, these are primitive, styled components built on Radix UI or Base UI primitives:
- Buttons
- Form inputs
- Dropdowns/Selects
- Modals/Dialogs
- Cards
- Tabs
- etc.

These components follow shadcn/similar conventions with consistent styling and accessibility.

---

## Styling Architecture

### Tailwind CSS
- **Version**: ^4.2.2
- **Config**: `tailwind.config.js`
- **Entry**: Imported in `src/index.css`

### Global Styles
- **index.css** — Global CSS variables, base styles, and utilities
- **Component-level CSS** — Scoped via class names or CSS modules

### Theming
- Color palette defined in `tailwind.config.js`
- CSS variables for consistent theming across the app
- Light/dark mode support (configured if needed)

---

## Routing Structure

Routes are defined in `App.tsx` using React Router v6:

**Route Organization**:
- Public routes: Login, Register, Email Verification, Password Reset
- Protected routes: Require authentication via JWT token
- Role-based routes: Different pages for Admin, Planner, Client roles

**Route Examples**:
- `/` — Default/home page
- `/login` — Authentication
- `/register` — User registration
- `/client-dashboard` — Client view
- `/admin-dashboard` — Admin view
- `/planner-management` — Planner workspace
- `/weddings` — Wedding management
- etc.

---

## API Communication

### api.ts (`src/lib/api.ts`)
Central API client for backend communication:

- **REST endpoints** to `/api/*` routes on the backend
- **Authentication** Using JWT tokens stored in cookies/localStorage
- **Request/response handling** with error management
- **Type-safe** via TypeScript interfaces

**Common API Methods**:
```typescript
// Users
GET /api/users
POST /api/users
GET /api/users/:id
PUT /api/users/:id

// Clients
GET /api/clients
POST /api/clients
GET /api/clients/:id
PUT /api/clients/:id

// Weddings
GET /api/weddings
POST /api/weddings
GET /api/weddings/:id
PUT /api/weddings/:id

// Tasks
GET /api/tasks
POST /api/tasks
PUT /api/tasks/:id

// And many more...
```

---

## State Management

This project uses **React hooks** for state management:
- `useState` — Local component state
- `useEffect` — Side effects (API calls, subscriptions)
- `useContext` — Shared state (authentication, user info)
- Custom hooks in `/src/hooks/` — Reusable stateful logic

**Note**: No external state management library (Redux, Zustand) currently used.

---

## TypeScript Best Practices

1. **Type all component props**:
   ```typescript
   interface ButtonProps {
     onClick: () => void;
     children: React.ReactNode;
   }
   ```

2. **Interface-driven API responses**:
   ```typescript
   interface Wedding {
     id: string;
     date: Date;
     spouse1Id: string;
     spouse2Id: string;
   }
   ```

3. **Avoid `any` type** — Use `unknown` with type guards if needed

4. **Use generics** for reusable components

---

## Development Workflow

### Running the Frontend
```bash
cd client
npm install        # Install dependencies
npm run dev        # Start Vite dev server (http://localhost:5173)
npm run build      # Build for production
npm run lint       # Check code quality
npm run preview    # Preview production build
```

### Development Tips
- **Hot Module Replacement (HMR)**: Changes to files automatically reload in the browser
- **Fast Refresh**: React component changes reload state preserving
- **ESLint**: Run `npm run lint` to catch issues before committing
- **TypeScript**: Hover over values for inline documentation

### Common Debugging
- Browser DevTools (F12) for frontend inspection
- Network tab to monitor API calls
- React DevTools extension for component tree inspection

---

## Performance Optimizations

1. **Code Splitting**: React Router lazy loading for pages
2. **React Compiler**: Babel plugin for automatic memoization
3. **Tailwind JIT**: Only shipped CSS for classes used in code
4. **Vite**: Optimized dev server with fast bundling

---

## Accessibility Considerations

- Base UI and Radix UI components have built-in ARIA support
- Use semantic HTML where possible
- Test keyboard navigation
- Ensure sufficient color contrast per WCAG guidelines

---

## Common Patterns

### Fetching Data
```typescript
const [wedding, setWedding] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchWedding = async () => {
    const data = await api.getWedding(id);
    setWedding(data);
    setLoading(false);
  };
  fetchWedding();
}, [id]);
```

### Form Handling
Use controlled components or form libraries like React Hook Form for complex forms.

### Conditional Rendering
```typescript
{user?.role === 'admin' && <AdminPanel />}
{isLoading ? <Spinner /> : <Content />}
```

---

## Further Documentation

- [TECH_STACK.md](TECH_STACK.md) — Full tech stack details
- [BACKEND_GUIDE.md](BACKEND_GUIDE.md) — Backend routes and API documentation
- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) — Database schema reference
