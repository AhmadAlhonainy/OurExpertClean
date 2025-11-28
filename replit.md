# Experience Booking Platform

## Overview

This is an Arabic-language (RTL) experience booking marketplace connecting learners with mentors for one-on-one sessions. The platform facilitates booking, secure payments via Stripe, and incorporates a trust-based review system. It operates on a marketplace model, enabling mentors to list their expertise and learners to browse and book sessions using an intelligent search engine. Funds are held in escrow until session completion.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

-   **Frameworks:** React 18 with TypeScript, Vite, Wouter for routing, TanStack Query for server state.
-   **UI:** Shadcn/ui (New York style), Radix UI primitives, Tailwind CSS, RTL support for Arabic, Inter and Sora fonts, intelligent search interface.
-   **State Management:** React Query for server state; local React state for UI.

### Backend

-   **Server:** Express.js with TypeScript.
-   **Authentication:** Session-based using Replit Auth (OpenID Connect) and Email/Password. PostgreSQL for session storage.
-   **API:** RESTful endpoints (`/api/*`), JSON communication, Zod validation, authenticated routes with `isAuthenticated` middleware.
    -   **Key Endpoints:** `/api/experiences` (intelligent search), `/api/bookings`, `/api/availability`, `/api/reviews`, `/api/payments`, `/api/auth/user`.
    -   **Admin Endpoints:** `/api/admin/bookings`, `/api/admin/users`, `/api/admin/experiences`, `/api/admin/complaints`, `/api/admin/revenue`.

### Database

-   **ORM:** Drizzle ORM.
-   **Database:** PostgreSQL via Neon serverless driver.
-   **Core Tables:** `users`, `experiences`, `availability`, `bookings`, `reviews`, `commissionRules`, `complaints`, `sessions`.

### Payment Processing

-   **Integration:** Stripe Connect for marketplace payments.
-   **Flow:** Payment intents with escrow, funds held until 24 hours post-session or review submission. Payment release/refund determined by reviews (≥3 stars for release, <3 for refund). Automated release after 24 hours if no review.
-   **Commission:** Platform fees deducted (e.g., 20%) before mentor payout.

### Authentication & Authorization

-   **Methods:** Email/Password (bcrypt hashing) and Google OAuth (via Replit Auth/OpenID Connect).
-   **Session Management:** PostgreSQL storage via `connect-pg-simple`, 7-day TTL, HTTP-only cookies, secure flag, CSRF protection.
-   **Authorization:** Middleware for route protection, ownership verification for sensitive data.

### Features

-   **Intelligent Search Engine:** ChatGPT-style search box, natural language queries across titles, descriptions, categories, cities, learning points. Supports exact phrase matching, word search (excluding stop words), and a fallback to random experiences.
-   **Stripe Connect Onboarding:** Dedicated page and API for mentors to connect Stripe accounts, manage status, and access dashboards. Enforced during experience creation.
-   **Availability Management System:** Secure creation and management of mentor availability slots with authorization checks and prevention of duplicate entries.

## External Dependencies

### Third-Party Services

-   **Stripe:** Marketplace payments (Connect, Payment Intents API, Webhooks).
-   **Replit Services:** Replit Auth (OpenID Connect), Replit Connectors (secure credential management), development tools.

### Database

-   **Neon PostgreSQL:** Serverless PostgreSQL via `@neondatabase/serverless`.

### UI Libraries

-   **Radix UI:** Accessible component primitives.

### Development Tools

-   **Type Safety:** TypeScript, Zod, Drizzle-zod.
-   **Build & Development:** esbuild, Vite, tsx.

### Asset Management

-   Stock and generated images in `/attached_assets/`.

### Font Resources

-   **Google Fonts:** Inter (UI/body), Sora (display/headings).