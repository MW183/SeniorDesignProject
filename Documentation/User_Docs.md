# Wedding Planner Application - User Documentation

## Table of Contents
1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [For Administrators](#for-administrators)
4. [For Wedding Planners](#for-wedding-planners)
5. [For Couples (Clients)](#for-couples-clients)
6. [Developer Information](#developer-information)
7. [FAQ](#faq)

---

## Overview

Welcome to the Wedding Planner Application, a comprehensive web-based system designed to streamline wedding planning from initial consultation to final execution. This application helps administrators manage staff, planners organize weddings, and couples track their wedding preparations in real-time.

### Key Features
- **Multi-role Access Control**: Different interfaces and permissions for admins, planners, and couples
- **Template-Based Task Generation**: Automatically create comprehensive task checklists from customizable templates
- **Date-Aware Task Management**: Tasks automatically adjust due dates based on your wedding date
- **Real-time Collaboration**: Couples and planners can view and update tasks together
- **Vendor Management**: Track vendors, ratings, and contact information
- **Role-Based Dashboards**: Each user type sees relevant information for their role

---

## Getting Started

### Accessing the Application

The Wedding Planner Application is accessible at: `https://senior-design-project-pearl.vercel.app`

### Initial Login

1. Navigate to the login page
2. Enter your email address and password
3. Click **Login**
4. You will be directed to your role-specific dashboard

**First-Time Setup**: If you're a new planner or couple, an administrator will have created your account with temporary credentials. Upon first login, you may be prompted to set a new password.

### Dashboard Overview

Upon logging in, you'll see your personalized dashboard based on your role:
- **Admin Dashboard**: System overview, planner management, wedding statistics
- **Planner Dashboard**: List of assigned weddings, upcoming tasks, client communications
- **Client Dashboard**: Your wedding details, assigned tasks, vendor information, timeline

---

## For Administrators

### Admin Dashboard

The Admin Dashboard provides a complete overview of the system and allows you to manage all users and weddings.

**<admin_dashboard_page>**

### Managing Planners

#### Viewing All Planners

1. Navigate to **Planner Management** from the main menu
2. View all active planners in the system
3. Use the search bar to find specific planners by name or email
4. Click **Refresh** to update the list

#### Creating New Planners

1. Go to **Planner Management**
2. Scroll to the "Add New Planner" section
3. Fill in the required fields:
   - **Name**: Full name of the planner
   - **Email**: Valid email address (must be unique)
   - **Password**: Secure password for login
4. Click **Create User**
5. The planner will receive a welcome email with their login credentials
6. New planners are automatically validated in the system

#### Deleting Planners

1. Go to **Planner Management**
2. Locate the planner in the list
3. Click the **Delete** button (red button)
4. Confirm the deletion in the popup
5. The planner account will be removed from the system along with their login ability

### Creating Weddings

#### New Wedding Entry

1. Navigate to **Create Wedding**
2. Fill in the wedding details:
   - **Wedding Date**: Select the date of the wedding
   - **Location**: Search for and select the venue address
   - **Spouse 1**: Select or create the first member of the couple
   - **Spouse 2**: Select or create the second member of the couple
   - **Lead Planner**: Assign a planner to this wedding
3. Click **Create Wedding**
4. The system will automatically:
   - Generate all task templates with calculated due dates
   - Send welcome emails to both partners
   - Create client accounts with temporary passwords
   - Notify the assigned planner

#### Editing Wedding Details

1. Go to **Admin Dashboard** or **Wedding List**
2. Select the wedding you wish to edit
3. Click **Edit** or the wedding card
4. Modify any field (date, venue, couples, assigned planner)
5. Click **Save**
6. Changes take effect immediately; affected tasks will have adjusted due dates if the wedding date changed

### Viewing Wedding Progress

1. Navigate to **Wedding List**
2. Click on any wedding to view full details
3. See all associated tasks, venues, vendors, and couple information
4. View task completion percentage and upcoming deadlines

---

## For Wedding Planners

### Planner Dashboard

Your dashboard shows all weddings assigned to you, upcoming tasks, and important deadlines.

**<planner_dashboard_page>**

### Managing Your Assigned Weddings

#### Viewing Your Weddings

1. Log in to your planner account
2. You'll see your **Assigned Weddings** on the main dashboard
3. Each wedding shows:
   - Wedding date
   - Couple names
   - Number of tasks (total and completed)
   - Overall progress percentage
4. Click on any wedding to view full details

#### Working with Tasks

1. Click on a wedding to open its task list
2. Tasks are organized by category (e.g., Venue, Catering, Photography)
3. For each task, you can:
   - View the task name, description, and due date
   - Update priority (Urgent, High, Normal)
   - Change status (Pending, In Progress, Blocked, Completed)
   - Add notes or comments
   - Assign to specific couple members (for couple tasks)

#### Updating Task Status

1. Click on a task in the list
2. Select the new status from the dropdown:
   - **Pending**: Not yet started
   - **In Progress**: Currently being worked on
   - **Blocked**: Waiting on external factors
   - **Completed**: Task is finished
3. Add any relevant notes
4. Click **Save**
5. The couple will see status updates in real-time

#### Managing Vendors

1. Go to **Vendors** for the specific wedding
2. View all vendor contacts and information
3. To add a new vendor:
   - Click **Add Vendor**
   - Fill in vendor details (name, type, email, phone, rating, notes)
   - Click **Save**
4. To update vendor information:
   - Click the vendor
   - Modify any field
   - Save changes
5. To rate a vendor:
   - Click the vendor
   - Add a rating (1-5 stars)
   - Add notes about your experience
   - Save

#### Communicating with Couples

- Couples can see all tasks assigned to them
- You can add task notes that couples will see
- Status changes notify couples in real-time
- Couples can update their own task status and email you directly

### Important Task Categories

Different wedding phases have different task types:

- **Administrative**: Legal documents, licenses, registrations
- **Venue**: Venue selection, contracts, payments, setup
- **Catering**: Menu selection, tastings, dietary accommodations
- **Photography/Video**: Photographer selection, shot list, timelines
- **Florals**: Bouquets, centerpieces, installations
- **Transportation**: Limo service, parking, accessibility
- **Timeline**: Rehearsal coordination, ceremony timeline, reception schedule

---

## For Couples (Clients)

### Client Dashboard

Your dashboard displays your upcoming tasks, wedding details, and vendor information.

**<client_dashboard_page>**

### Viewing Your Tasks

1. Log in with your email and password
2. Click on your wedding to view all assigned tasks
3. Tasks are grouped by category and sorted by due date
4. Each task shows:
   - Task name and description
   - Due date
   - Current status
   - Assigned to (you, your partner, or both)
   - Priority level

### Updating Your Task Status

1. Click on a task assigned to you
2. Update the status to reflect your progress:
   - **Pending**: Not started
   - **In Progress**: Currently working on it
   - **Blocked**: Waiting on something
   - **Completed**: Finished
3. Add any notes or updates for your planner
4. Click **Save**
5. Your planner will be notified of status changes

### Important Notes

- Tasks are automatically created when your wedding is registered
- Due dates are calculated based on your wedding date
- Your planner will assign tasks to you and your partner as needed
- Check your email regularly for task notifications and updates
- Contact your planner if any task seems incorrect or needs adjustment

---

## Developer Information

### Application Architecture

This Wedding Planner Application is built using modern web technologies with a focus on scalability, security, and user experience.

**Frontend Stack**:
- **Framework**: React 19 with TypeScript for type-safe, maintainable code
- **Build Tool**: Vite for fast development and optimized production builds
- **Styling**: Tailwind CSS for responsive, utility-first design
- **Routing**: React Router v6 for client-side navigation
- **Deployment**: Vercel for automatic deployment and hosting

**Backend Stack**:
- **Runtime**: Node.js with Express.js framework
- **Database**: PostgreSQL via Supabase with connection pooling
- **ORM**: Prisma for type-safe database access
- **Authentication**: JWT (JSON Web Tokens) with bcrypt password hashing
- **Email**: SendGrid for transactional emails
- **Deployment**: Render.com for backend hosting

**Database Schema**:
- **Users**: Core user records with role-based access control (ADMIN, USER, PLANNER, CLIENT)
- **Weddings**: Central wedding records with references to couples and venues
- **Tasks**: Individual task items with dependencies and due dates
- **WeddingTemplates**: Reusable task templates with categorized tasks
- **Vendors**: Vendor information, ratings, and contact details
- **Addresses**: Venue and vendor addresses

### Key Technical Features

- **Batch Operations**: Template instantiation uses optimized batch inserts to minimize database queries
- **Connection Pooling**: PgBouncer manages database connections efficiently on free-tier Supabase
- **CORS Management**: Secure cross-origin requests between Vercel frontend and Render backend
- **Email Verification**: SendGrid-powered email verification for security
- **Automatic Task Generation**: Creating a wedding automatically generates 300+ templated tasks

### Documentation Links

For developers working on this project:

- [Backend Guide](BACKEND_GUIDE.md) - API endpoints, database schema, backend architecture
- [Frontend Guide](FRONTEND_GUIDE.md) - Component structure, state management, styling conventions
- [Database Schema](DATABASE_SCHEMA.md) - Detailed schema documentation and relationships
- [Tech Stack](TECH_STACK.md) - Complete technology stack with versions and justifications

---

## FAQ

### Getting Started

**Q: How do I access the application?**
A: Navigate to `https://senior-design-project-pearl.vercel.app` and log in with your email and password provided by your administrator.

**Q: I forgot my password. How do I reset it?**
A: Click "Forgot your password?" on the login page, enter your email, and follow the reset link sent to your inbox. If you don't receive an email, check your spam folder or contact your administrator.

**Q: What if my account isn't working?**
A: Verify your email is correct, your account has been created by an administrator, and your browser's cookies are enabled. Contact the system administrator if issues persist.

---

### For Administrators

**Q: How do I start the application for development?**
A: 
1. Ensure you have Node.js 16+ installed
2. Clone the repository and navigate to the project directory
3. For frontend: `cd client && npm install && npm run dev`
4. For backend: `cd server && npm install && npm run dev` (after setting up `.env` with database credentials)
5. Access the app at `http://localhost:5173` (frontend) and `http://localhost:3000` (backend API)

**Q: What about production setup?**
A: The application uses:
- **Vercel** for frontend deployment (auto-deploys on git push)
- **Render** for backend deployment (set root directory to `server/`)
- **Supabase** for PostgreSQL database (configure `DATABASE_URL` for pooled connection)

Ensure all environment variables are set in each deployment platform.

**Q: How do I run the test suite?**
A: Currently, validation tests are available in `server/test/`:
- Run `npm test` or `node test/validation_tests.js` from the server directory
- API tests can be run with `node test/run_api_tests.js`
- Vendor-specific tests: `node test/vendor_tests.js`
- Wedding date update tests: `node test/wedding_date_update_tests.js`
- Connectivity Tests: `node test-ipv4-connection.js`

Tests verify database connectivity, user creation, wedding instantiation, and task generation.

---

### Managing Templates

**Q: How do I update the wedding planning template?**
A: Wedding templates are managed through two files:
1. **CSV-based approach**: Edit `server/templates/onboarding+planning+finalization.csv` and run `node templates/parseTemplateFromCSV.js`
2. **JavaScript approach**: Modify `server/templates/weddingPlanningTemplate.js` with new categories and tasks
3. Seed the template: `node templates/seed-template.js`
4. When a new wedding is created, it automatically uses the latest template

**Q: Can I customize tasks for specific clients?**
A: Yes. After a wedding is created with the template:
1. Manually add new tasks: Click "Add Task" on the wedding
2. Edit existing tasks: Click the task to modify name, description, or due date
3. Delete tasks: Remove tasks no longer needed
4. Assign tasks: Assign to couple members or planners as needed

All changes take effect immediately and notify affected parties.

**Q: How do I handle template dependencies?**
A: Dependencies are defined in the template but currently commented out (planned feature). You can manually track task dependencies through task descriptions and notes until full dependency support is implemented.

---

### For Planners

**Q: How many weddings can be assigned to me?**
A: There is no limit. You can manage multiple weddings simultaneously. Use filters and search to keep organized.

**Q: Can I reassign my weddings to another planner?**
A: Contact your administrator to reassign weddings. You cannot reassign weddings yourself for security reasons.

**Q: How do I know which tasks are overdue?**
A: Tasks are color-coded by due date. Red indicates overdue, yellow indicates due soon, and green indicates tasks with time remaining. Sort by due date to see urgent tasks first.

**Q: Can couples edit their own tasks?**
A: Yes, couples can update task status and add notes. They cannot delete tasks or change due dates—only planners can make those modifications.

---

### For Couples

**Q: Who can see my wedding tasks and information?**
A: Only you, your partner, your assigned planner, and administrators can see your information. Your information is private and secure.

**Q: Can I add my own tasks?**
A: Tasks are created by your planner based on the wedding template. If you need additional tasks, contact your planner to add them.

**Q: What if I mark a task complete but it's not actually done?**
A: You can update the status anytime. Just reopen the task and change it back to "In Progress" or "Pending." Your planner will see the history of status changes.

**Q: Can I see what my partner is doing on wedding tasks?**
A: Yes. Both partners can see all tasks, though only tasks specifically assigned to each partner will show up in their personal task list. Shared tasks are visible to both.

---

### Technical Support

**Q: The application is running slowly. What can I do?**
A: 
- Clear your browser cache and reload the page
- Disable browser extensions temporarily
- Try a different browser
- Check your internet connection
- Contact your administrator if slowness persists

**Q: I see an error message. What should I do?**
A: 
1. Note the error message exactly
2. Screenshot the error if possible
3. Refresh the page and try again
4. If the error persists, contact your administrator with the error details

**Q: Is my data backed up?**
A: Yes. All data is stored in a professionally managed PostgreSQL database (Supabase) with automatic daily backups.

---

## Contact & Support

For questions or issues not covered in this documentation:
- Contact your Wedding Planner Administrator
- Provide specific details about what you were doing when the issue occurred
- Include any error messages or screenshots

---

**Document Version**: 1.0  
**Last Updated**: April 2, 2026  
**Application Version**: 1.0 Production
