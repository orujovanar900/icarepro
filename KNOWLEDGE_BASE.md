# iCarePro Knowledge Base

Welcome to the iCarePro Knowledge Base. This document provides a structural overview of the application, its monorepo architecture, and the responsibilities of each module.

> **Note**: This document reflects the system state on the `main` branch.

## Architecture & Tech Stack

The workspace is structured as a **Turborepo monorepo**, managing applications and shared packages.

### Applications (`apps/`)
- **`apps/api` (Backend)**:
  - **Framework**: Fastify (Node.js/TypeScript)
  - **Responsibilities**: Serves REST APIs, handles business logic, cron jobs, background processes, document generation, and integrations.
  - **Key libraries**: `@prisma/client`, `zod`, `fastify-multipart`, `pdfmake`, `mammoth`.

- **`apps/web` (Frontend)**:
  - **Framework**: React + Vite (TypeScript)
  - **Responsibilities**: Single Page Application serving both the internal CRM dashboard and the public-facing platform (Portal, Landing Page).
  - **Key libraries**: `react-router-dom`, `zustand` (state), `@tanstack/react-query` (data fetching), `tailwindcss`, `react-hook-form`.

### Packages (`packages/`)
- **`packages/database`**:
  - Contains the Prisma schema (`schema.prisma`) defining all models and enums.
  - Used by `apps/api` to generate the correct client.
  - **Database**: PostgreSQL (hosted on Supabase).

---

## Core System Modules (CRM)

These are the foundational B2B tools used by property owners, managers, and agencies to handle their daily real estate business.

### 1. Organization & User Management
- **Multi-tenant System**: Users belong to Organizations (`Organization` model). Some platform staff (like SuperAdmins) have no specific organization.
- **Roles (RBAC)**: Supports diverse roles including `SUPERADMIN`, `MODERATOR`, `OWNER`, `MANAGER`, `CASHIER`, `ACCOUNTANT`, and various tenant roles (`ICARECI`, `TENANT`).
- **Organizations Types**: Organizations are categorized by type: `FERDI_VETANDAS` (Individual), `FERDI_SAHIBKAR` (Individual Entrepreneur), `HUQUQI_SEXS` (Legal Entity).

### 2. Properties (Obyektlər)
- **Responsibility**: Management of real estate units, their physical locations, and statuses (`VACANT`, `OCCUPIED`, `UNDER_REPAIR`).
- Includes storing geolocation data (`lat`/`lng`) and property photos.

### 3. Tenants (İcarəçilər)
- **Responsibility**: Management of the individuals or companies renting the properties.
- Differs based on entity type: 
  - **Fiziki (Individuals)** require FIN and Passport details.
  - **Hüquqi (Legal Entities)** require VÖEN and Director details.

### 4. Contracts (Müqavilələr)
- **Responsibility**: Management of diverse rental agreements:
   1. Long-term Residential.
   2. Commercial (with revenue percentage features).
   3. Short-term/Daily.
   4. Parking Sublets/Subcontracts.
- Advanced features: Auto-renewal alerts, grace periods, customizable payment modes (calendar vs fixed day).

### 5. Finances (Income & Expenses)
- **Payments**: Represents rent and other incomes. Handles expected vs paid amounts, penalties, overdues, and automatic cron-based generation.
- **Expenses (Xərclər)**: Tracks operational spending by organizations.

### 6. Document Generation (Sənəd Ustası)
- **Responsibility**: Automatically assembling PDF/Word acts, invoices, and debt notices based on tenant and contract data.

---

## New Marketplace & Promotion Modules

The latest updates to the platform shift it from a closed CRM tool to an open marketplace (**Növbəli İcarə**).

### 1. Listings (Elanlar)
- **Responsibility**: Converting an available property in the CRM into a public-facing listing on the portal.
- **Key aspects**:
  - Handles real estate types (`MENZIL`, `OFIS`, `OBYEKT`, etc.).
  - Tracks status (`DRAFT`, `PENDING`, `ACTIVE`, `REJECTED`) and availability (`BOSHDUR`, `BOSHALIR`, `INSAAT`).
  - Supports Moderation (approve/reject).
  - VIP and Pushed states for premium visibility (IsVip, IsPanorama).

### 2. Queue System (Növbə)
- **Responsibility**: Allows prospective tenants to "queue" up for a listed property and make a bid.
- Prospective tenants provide details (employ status, pets, smoker status, offered price) which owner/agents can review.
- Resolves the matching phase before an official contract is made.

### 3. Moderation & User Feedback
- **Reports (`ListingReport`)**: Users can flag or report malicious/incorrect listings.
- **Favorites (`ListingFavorite`)**: Lets users save specific listings they want to monitor.
- **SuperAdmin Moderation (`AdminAuditLog`)**: Allows operators to keep a detailed track of administrative actions across the platform for accountability.

### 4. Promotions & LED Ticker
- **Responsibility**: Advertising and marketing subsystem.
- **`PromotionRequest`**: Agencies or Owners can request special promotion for their listings or brands.
- **`TickerSlot`**: Represents ads that run continuously on the platform's LED-like ticker. Can be used for text-based ads or featured listings with configurable scheduling, placement, and daily impression limits.
