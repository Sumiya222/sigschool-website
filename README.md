# The Signature School

**The Signature School** is a modern, full-stack educational management platform and public portal designed for STEM and Robotics programs. It seamlessly connects public-facing course offerings, admissions, and career applications with role-based administrative dashboards for managing students, instructors, partner schools, invoices, and site content.

---

## 🚀 Key Features

### 🌐 Public Portal
- **Interactive STEM & Robotics Programs**: Explore offered robotics, coding, and STEM curricula with rich 3D elements and interactive UI components.
- **Online Admissions & Applications**: Student enrollment portal and career application submissions with CV uploads.
- **Partner School Network**: Showcase of partner institutions, programs for schools, and collaboration details.
- **Contact & Inquiries**: Integrated communication forms with automated email notifications.

### 🛡️ Role-Based Dashboards
- **Super Admin Dashboard**:
  - System health metrics and overall platform analytics.
  - Complete student roster management and detail tracking.
  - Instructor onboarding, section assignments, and performance monitoring.
  - School and section configuration with capacity management.
  - Financial invoice creation, status tracking, and breakdown reporting.
  - Academic terms configuration and audit logging.
  - Whitelist access control and user permission management.
- **Instructor Dashboard**:
  - Assigned section controls, student attendance tracking, and evaluation management.
- **School Admin Dashboard**:
  - Partner school statistics, section monitoring, student rosters, and school-specific financial invoices.
- **CMS Dashboard**:
  - Dynamic public site content editing and media asset management powered by Supabase storage.

### 🔐 Security & Operations
- **Authentication**: Secure role-based route protection and authentication using Supabase Auth.
- **Database Security**: PostgreSQL Row Level Security (RLS) policies enforcing data boundaries per role.
- **Data Export & Reporting**: PDF generation (`jsPDF` / `jspdf-autotable`) for invoices/reports and Excel support (`xlsx`) for roster management.
- **Email Notifications**: Transactional emails powered by `@react-email/components`, `Resend`, and `Nodemailer`.

---

## 🛠️ Tech Stack

- **Framework**: [TanStack Start](https://tanstack.com/router) + [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org/)
- **Routing & Data Fetching**: [TanStack Router](https://tanstack.com/router) + [TanStack React Query](https://tanstack.com/query)
- **Build Tool & Server**: [Vite](https://vitejs.dev/) + [Nitro](https://nitro.unjs.io/)
- **Styling & UI**: [Tailwind CSS v4](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/) + [Framer Motion](https://www.framer.com/motion/) + [Lucide Icons](https://lucide.dev/)
- **Visuals & 3D**: [Three.js](https://threejs.org/) + [`@react-three/fiber`](https://docs.pmnd.rs/react-three-fiber) + [`@react-three/drei`](https://github.com/pmndrs/drei) + [Recharts](https://recharts.org/)
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL, Row Level Security, Auth, Storage)
- **Forms & Validation**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Reporting & Exports**: `jsPDF`, `jspdf-autotable`, `xlsx`
- **Email Engine**: `@react-email/components`, `resend`, `nodemailer`

---

## 📁 Project Structure

```text
TheSignatureSchool/
├── docs/                      # Deployment & Backend Migration Runbooks
│   └── SETUP.md               # Backend setup, RLS, storage buckets, & admin setup
├── public/                    # Static assets & public files
├── scripts/                   # Utility scripts (migrations, smoke tests, hoster entry)
├── src/
│   ├── assets/                # Logos, graphics, and image assets
│   ├── components/            # Reusable UI components & Radix UI primitives
│   │   └── camp/              # Registration & announcement components
│   ├── hooks/                 # Custom React hooks (Auth, Supabase queries)
│   ├── integrations/          # Supabase client & third-party integrations
│   ├── lib/                   # Helper functions, site config & content providers
│   ├── routes/                # File-based routing (TanStack Router)
│   │   ├── dashboard.*        # Admin, Instructor, School Admin, & CMS routes
│   │   └── index.tsx          # Main public landing page
│   ├── router.tsx             # TanStack Router configuration
│   ├── server.ts              # TanStack Start server handler & SSR error wrapper
│   └── styles.css             # Main stylesheet & Tailwind imports
├── supabase/
│   ├── bootstrap/             # Super Admin bootstrapping SQL scripts
│   └── migrations/            # Timestamped database migrations & RLS policies
└── tests/                     # Automated link parity and utility tests
```

---

## 🏁 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or v22 recommended) or [Bun](https://bun.sh/)
- npm / yarn / pnpm / bun

### 1. Environment Setup

Create a `.env` file in the project root with your Supabase project credentials (refer to `.env.example` if available):

```env
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 2. Installation

Install project dependencies:

```bash
npm install
```

### 3. Local Development

Start the Vite development server:

```bash
npm run dev
```

Open your browser at `http://localhost:3000` (or the URL output by Vite).

---

## 📜 Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Starts the Vite local development server. |
| `npm run build` | Builds the application for production using Nitro. |
| `npm run build:dev` | Builds the application targeting development mode. |
| `npm run preview` | Previews the production build locally. |
| `npm run lint` | Runs ESLint across all TypeScript and React files. |
| `npm run typecheck` | Runs TypeScript compiler (`tsc --noEmit`) to verify types. |
| `npm run test:link-target-parity` | Runs link target parity test suite. |
| `npm run format` | Formats all files across the codebase using Prettier. |

---

## 📖 Backend & Database Setup

For detailed instructions on applying database migrations, configuring private Supabase storage buckets, and setting up the initial Super Admin account, refer to the [Setup Runbook](docs/SETUP.md).

---

## 📄 License

Private repository — All rights reserved by **The Signature School**.