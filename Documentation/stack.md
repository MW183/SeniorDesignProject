# Tech Stack Overview

This document provides a comprehensive overview of the technologies, libraries, and versions used in the Tenamore Wedding Planning Project.

## Project Structure
This is a full-stack application with separate client and server implementations, managed from the root directory using `concurrently` for parallel development.

---

## Frontend Stack

### Core Runtime & Build Tools
- **Node.js**: Use any LTS version (^18 or higher recommended)
- **npm**: Package manager (included with Node.js)
- **Vite**: ^7.1.7 — Modern build tool and dev server, provides fast HMR (Hot Module Replacement)
- **TypeScript**: ~5.9.3 — Strongly typed JavaScript for safer development
- **React**: ^19.1.1 — UI library with latest features and Concurrent Rendering optimizations
- **React DOM**: ^19.1.1 — DOM rendering for React
- **React Router DOM**: ^6.30.2 — Client-side routing and navigation

### Styling & CSS
- **Tailwind CSS**: ^4.2.2 — Utility-first CSS framework
- **@tailwindcss/vite**: ^4.2.2 — Vite plugin for Tailwind CSS
- **@tailwindcss/postcss**: ^4.2.1 — PostCSS plugin for Tailwind
- **postcss**: ^10.4.24 — CSS preprocessor (configured in postcss.config.cjs)
- **autoprefixer**: ^10.4.24 — Adds vendor prefixes to CSS
- **tailwind-merge**: ^3.5.0 — Merge Tailwind classes intelligently
- **tw-animate-css**: ^1.4.0 — Additional animation utilities

### UI Components & Icons
- **@base-ui/react**: ^1.3.0 — Unstyled, accessible component library
- **radix-ui**: ^1.4.3 — Primitives for building high-quality design systems
- **shadcn**: ^4.1.0 — Copilot-friendly component system (not shadcn/ui)
- **cmdk**: ^1.1.1 — Command menu component
- **lucide-react**: ^1.7.0 — Icon library (2000+ icons)
- **@tabler/icons-react**: ^3.40.0 — Tabler icon set
- **class-variance-authority**: ^0.7.1 — Type-safe component variants
- **clsx**: ^1.2.1 — Utility for constructing className strings

### Fonts
- **@fontsource-variable/dm-sans**: ^5.2.8
- **@fontsource-variable/geist**: ^5.2.8
- **@fontsource-variable/inter**: ^5.2.8

### Development Tools
- **ESLint**: ^9.36.0 — Code linter
- **@eslint/js**: ^9.36.0 — ESLint JavaScript config
- **typescript-eslint**: ^8.45.0 — TypeScript support for ESLint
- **eslint-plugin-react-hooks**: ^5.2.0 — Enforce React Hooks rules
- **eslint-plugin-react-refresh**: ^0.4.22 — Enforce React Fast Refresh rules
- **@vitejs/plugin-react**: ^5.0.4 — Vite React plugin with Fast Refresh
- **babel-plugin-react-compiler**: ^19.1.0-rc.3 — React compiler for optimization
- **@types/react**: ^19.1.16 — TypeScript types for React
- **@types/react-dom**: ^19.1.9 — TypeScript types for React DOM
- **@types/node**: ^24.12.0 — TypeScript types for Node.js APIs
- **globals**: ^16.4.0 — ESLint globals configuration

### TypeScript Configuration
- **tsconfig.json**: Main TypeScript configuration
- **tsconfig.app.json**: App-specific TypeScript settings
- **tsconfig.node.json**: Node utilities TypeScript settings

---

## Backend Stack

### Core Runtime & Framework
- **Node.js**: Use any LTS version (^18 or higher recommended)
- **npm**: Package manager
- **Express**: ^5.1.0 — Web framework for building REST APIs
- **nodemon**: ^3.0.1 — Development tool for auto-reloading on file changes

### Database & ORM
- **PostgreSQL**: Primary database (connection string via DATABASE_URL env var)
- **Prisma**: ^6.19.2 — Modern ORM and database toolkit
- **@prisma/client**: ^6.18.0 — Generated database client for Node.js

### Authentication & Security
- **jsonwebtoken**: ^9.0.3 — JWT token generation and verification
- **bcrypt**: ^6.0.0 — Password hashing (primary library)
- **bcryptjs**: ^3.0.3 — Alternative password hashing fallback
- **cookie-parser**: ^1.4.7 — Parse HTTP cookie headers
- **cors**: ^2.8.5 — Enable Cross-Origin Resource Sharing

### Email & Messaging
- **@sendgrid/mail**: ^8.1.6 — SendGrid email service integration
- **nodemailer**: ^7.0.13 — Email sending library

### Validation
- **zod**: ^4.1.12 — TypeScript-first schema validation

### Environment Configuration
- **dotenv**: ^17.2.3 — Load environment variables from .env file

---

## Project-Level Scripts

### Root Directory (`package.json`)
Located in the project root with `concurrently` for parallel execution:

```bash
npm run dev      # Run both server and client in development mode
npm start        # Start both server and client in production mode
```

### Frontend Development (`client/package.json`)
```bash
npm run dev      # Start Vite dev server (http://localhost:5173)
npm run build    # TypeScript check + Vite production build
npm run lint     # Run ESLint
npm run preview  # Preview production build locally
```

### Backend Development (`server/package.json`)
```bash
npm start                           # Run server with Node
npm run dev                         # Run server with nodemon (watches for changes)
npm run generate-template          # Parse CSV template, run migrations, seed template
```

---

## Environment Variables

### Client (`.env` in `/client`)
No specific environment variables required; configuration is typically done via Vite.

### Server (`.env` in `/server`)
- `DATABASE_URL`: PostgreSQL connection string (required)
- `CLIENT_URL`: Frontend URL for CORS configuration (default: `http://localhost:5173`)
- `JWT_SECRET`: Secret key for signing JWT tokens
- `SENDGRID_API_KEY`: SendGrid API key for email functionality
- Other authentication and email service keys as needed

---

## Database

- **PostgreSQL**: Relational database backend
- **Prisma Migrations**: Managed through Prisma CLI (`prisma migrate dev`, `prisma migrate reset`)
- **Database URL**: Configured via `DATABASE_URL` environment variable

---

## Development Workflow

1. **Setup**: Install Node.js, clone the repo, run `npm install` in both `/client` and `/server`
2. **Environment**: Create `.env` file in `/server` with required database connection
3. **Database**: Run `prisma migrate dev` to initialize database schema
4. **Development**: Run `npm run dev` from root to start both client and server
5. **Frontend**: Access at `http://localhost:5173` (Vite dev server)
6. **Backend**: API at `http://localhost:3000` (Express server, adjust port as needed)

---

## Performance & Optimizations

### Frontend
- **Vite HMR**: Fast development with hot module replacement
- **React Compiler**: Babel plugin for automatic component optimization
- **Tailwind JIT**: Just-in-time CSS generation
- **TypeScript**: Static type checking prevents runtime errors

### Backend
- **Prisma Client**: Efficient database queries with generated types
- **Prisma Migrations**: Version-controlled schema changes
- **Express Middleware**: CORS, cookie parsing, JSON parsing configured for optimal routing

---

## Documentation Structure

- [FRONTEND_GUIDE.md](FRONTEND_GUIDE.md) — Frontend component architecture and page structure
- [BACKEND_GUIDE.md](BACKEND_GUIDE.md) — Backend routes, API structure, and testing
- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) — Complete database schema documentation
