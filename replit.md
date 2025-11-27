# Experience Booking Platform - Replit Documentation

## Overview

This is an Arabic-language (RTL) experience booking marketplace that connects learners with mentors who have real-world experience in various fields. The platform enables one-on-one mentorship sessions, with integrated payment processing through Stripe and a trust-based review system.

The application follows a marketplace model similar to Airbnb for experiences, allowing mentors to list their expertise, learners to browse and book sessions using an intelligent search engine, and facilitating secure payments with funds held in escrow until session completion.

**Note:** Meeting locations simplified to city selection only (café/coffee shop field removed from all components).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System:**
- React 18 with TypeScript for type safety
- Vite as the build tool and development server
- Wouter for client-side routing (lightweight alternative to React Router)
- TanStack Query (React Query) for server state management and data fetching

**UI Component System:**
- Shadcn/ui component library (New York style) with Radix UI primitives
- Tailwind CSS for styling with custom design tokens
- RTL (right-to-left) layout support for Arabic language
- Custom typography system: Inter for UI/body text, Sora for display/headings
- Intelligent search interface with ChatGPT-style search box on booking page

**State Management:**
- React Query for all server state (experiences, bookings, users)
- Local React state for UI interactions
- Session-based authentication state

### Backend Architecture

**Server Framework:**
- Express.js server with TypeScript
- Session-based authentication using Replit Auth (OpenID Connect)
- PostgreSQL sessions stored via connect-pg-simple

**API Design:**
- RESTful API endpoints under `/api/*` prefix
- Authenticated routes protected by `isAuthenticated` middleware
- Request/response logging for API routes
- JSON-based communication with validation via Zod schemas

**Key Routes:**
- `/api/experiences` - Experience listing and filtering with intelligent search support
  - Supports `?search={query}` parameter for natural language queries
  - Searches across title, description, category, city, and learning points
  - Case-insensitive text matching using PostgreSQL ILIKE
- `/api/bookings` - Booking creation and management
- `/api/bookings/:id/accept` - Mentor accepts booking
- `/api/bookings/:id/reject` - Mentor rejects booking
- `/api/availability` - Mentor availability slots
- `/api/reviews` - Post-session reviews
- `/api/payments` - Stripe payment intents and webhooks
- `/api/auth/user` - User session management

**Admin Routes (Protected):**
- `/api/admin/bookings` - View all platform bookings
- `/api/admin/users` - Manage all users
- `/api/admin/experiences` - View and approve/reject experiences
- `/api/admin/experiences/:id/approve` - Approve or reject experience
- `/api/admin/complaints` - View and manage complaints
- `/api/admin/complaints/:id` - Update complaint status
- `/api/admin/revenue` - Platform revenue statistics

### Database Architecture

**ORM & Migration:**
- Drizzle ORM for type-safe database queries
- PostgreSQL via Neon serverless driver with WebSocket support
- Schema-first approach with TypeScript type inference

**Core Tables:**
1. **users** - Learner and mentor profiles with Stripe integration
   - Roles: learner, mentor, admin
   - Stripe customer ID (learners) and account ID (mentors)

2. **experiences** - Mentor service listings
   - Category, price, location (city only - café field removed)
   - Learning points and descriptions
   - Approval status (pending, approved, rejected) for admin review
   - Searchable via intelligent search engine

3. **availability** - Time slots for bookings
   - Date, start/end times
   - Booking status tracking

4. **bookings** - Session reservations
   - Links learner, mentor, experience, and availability
   - Payment and booking status tracking
   - Stripe payment intent references

5. **reviews** - Post-session feedback
   - 1-5 star rating system
   - Determines payment release (≥3) or refund (<3)

6. **commissionRules** - Platform fee structure
   - Percentage-based or flat fees
   - Applied at payment processing

7. **complaints** - User complaints and support tickets
   - Reporter and reported user references
   - Booking reference (optional)
   - Status tracking (pending, in_review, resolved, closed)
   - Admin notes and resolution tracking

8. **sessions** - Express session storage for authentication

### Payment Processing System

**Stripe Integration:**
- Stripe Connect for marketplace payments
- Payment intents with fund holding (escrow pattern)
- Separate publishable and secret keys for dev/production

**Payment Flow:**
1. Booking creates Stripe payment intent
2. Funds held until session completion (24 hours post-session)
3. Review submission triggers payment release or refund
4. Auto-release after 24-hour review window expires
5. Background processor (`paymentProcessor.ts`) handles scheduled releases

**Commission Logic:**
- Platform fees deducted before mentor payout
- Configurable per category or flat rate

### Authentication & Authorization

**Replit Auth (OpenID Connect):**
- OAuth 2.0 flow with Replit as identity provider
- Session management with PostgreSQL backing
- Token refresh and expiration handling
- User claims stored in session

**Session Security:**
- HTTP-only cookies
- Secure flag enabled
- 7-day session TTL
- CSRF protection via session secret

## External Dependencies

### Third-Party Services

**Stripe (Payment Processing):**
- Marketplace payments via Stripe Connect
- Payment intents API for escrow functionality
- Webhook handling for payment events
- Retrieved via Replit Connectors with environment-specific keys

**Replit Services:**
- Replit Auth for user authentication (OpenID Connect)
- Replit Connectors for secure credential management
- Replit development tools (vite plugins for cartographer, dev banner, error overlay)

### Database

**Neon PostgreSQL:**
- Serverless PostgreSQL with WebSocket support
- Connection pooling via @neondatabase/serverless
- Provisioned through `DATABASE_URL` environment variable

### UI Libraries

**Radix UI Primitives:**
- Accessible component primitives (dialogs, dropdowns, calendars, etc.)
- 20+ components for complex interactions
- ARIA-compliant and keyboard navigable

### Development Tools

**Type Safety:**
- TypeScript with strict mode
- Zod for runtime schema validation
- Drizzle-zod for database schema validation

**Build & Development:**
- esbuild for server bundling
- Vite for client bundling and HMR
- tsx for TypeScript execution in development

### Asset Management

- Stock images stored in `/attached_assets/stock_images/`
- Generated images in `/attached_assets/generated_images/`
- Path aliases via Vite config (`@assets`)

### Font Resources

**Google Fonts:**
- Inter (weights: 400, 500, 600, 700) - UI and body text
- Sora (weights: 600, 700, 800) - Display and headings

## Recent Changes

### Stripe Connect Onboarding (November 25, 2025) 💳

**Mentor Payment Setup System:**

1. **New API Routes:**
   - `GET /api/stripe/connect/status` - Check mentor's Stripe Connect status
   - `POST /api/stripe/connect/onboard` - Create Stripe Express account and get onboarding URL
   - `POST /api/stripe/connect/dashboard` - Get link to Stripe Express dashboard

2. **Mentor Stripe Connect Page (`/mentor/stripe-connect`):**
   - Full-page UI for mentors to connect their Stripe account
   - Status display showing connected/payouts/charges status
   - Onboarding flow with redirect to Stripe
   - Dashboard link to access Stripe Express dashboard
   - FAQ section explaining payment flow (80% mentor / 20% platform)

3. **Dual-Layer Enforcement:**
   - **Frontend:** CreateExperience.tsx blocks access during loading, error, or if not connected
   - **Backend:** POST /api/experiences returns 403 with code "STRIPE_REQUIRED" if no stripeAccountId
   - **Dashboard Alerts:** MentorDashboard shows warning if Stripe not connected or not fully enabled

4. **Stripe Express Accounts:**
   - Country: SA (Saudi Arabia)
   - Capabilities: card_payments, transfers
   - Automatic commission deduction: 20% platform fee
   - Remaining 80% transferred to mentor after session completion

**Files Modified:**
- `server/routes.ts` - Stripe Connect API routes + experience creation guard
- `client/src/pages/MentorStripeConnect.tsx` - New dedicated page
- `client/src/pages/MentorDashboard.tsx` - Status alerts
- `client/src/pages/CreateExperience.tsx` - Stripe requirement check
- `client/src/App.tsx` - Route registration

### Security Hardening (November 24, 2025) 🔒

**Critical Security Fixes - Availability Management System:**

1. **Account Takeover Prevention:**
   - Fixed `upsertUser` vulnerability in both MemStorage and DbStorage
   - Now rejects attempts to reuse existing emails with different user IDs
   - Prevents malicious users from hijacking accounts via OAuth email collision

2. **Authorization Gaps Closed:**
   - **GET /api/experiences/:id/availability:** Now requires authentication and verifies mentor ownership
   - **DELETE /api/availability/:id:** Ownership verification happens before revealing booking status
   - Prevents unauthorized access to sensitive availability data

3. **Race Condition Protection:**
   - **Database Layer:** Added unique constraint `availability_uniqueExperienceDate` on (experience_id, date)
   - **Application Layer:** MemStorage enforces duplicate prevention locally
   - **Route Layer:** Unified error handling returns Arabic message: "هذا الوقت موجود بالفعل"
   - Prevents double-booking and duplicate time slots under concurrent requests

**Technical Implementation:**
- Database migration applied via `ALTER TABLE` (constraint active in production)
- Error consistency across both storage implementations
- Thread-safe atomic enforcement at database level
- Application-level validation for in-memory storage

**Files Modified:**
- `server/storage.ts` - UpsertUser security, MemStorage duplicate prevention
- `server/routes.ts` - Authorization checks, error handling
- `shared/schema.ts` - Unique constraint definition
- Database - Constraint applied successfully

### Availability Management System (November 22-24, 2025)

### Intelligent Search Engine Implementation ✅
- **Replaced multi-step category selection with ChatGPT-style search box**
- Search functionality searches across:
  - Experience titles
  - Descriptions
  - Categories
  - Cities
  - Learning points (array field)
- Backend implementation:
  - Smart multi-level search:
    1. Exact phrase matching (e.g., "أريد مرشد في روسيا")
    2. Individual word search excluding stop words (في, من, أن, أريد, إلخ)
    3. Fallback: If no results, shows up to 6 random approved experiences
  - Support for both DbStorage and MemStorage
  - URL parameter: `?search={query}`
- Frontend implementation:
  - Real-time search results as user types
  - Large, prominent search input with Sparkles icon
  - Helper text with Lightbulb icon (following no-emoji design rule)
  - Custom queryFn to bypass default fetcher caching issues
  - Disabled caching: `staleTime: 0, gcTime: 0` for fresh data on every request
- User can type natural queries like:
  - "أريد مرشد من روسيا" (I want a mentor from Russia)
  - "السفر" (Travel)
  - "الرياض" (Riyadh)
  - Or any combination of keywords
  - Even invalid searches return results (fallback to 6 experiences)

### Bug Fixes & Optimizations
- Fixed queryKey URL construction issue that prevented search from working
- Disabled React Query cache to ensure all users see current data (not cached from other users)
- Implemented smart fallback: no more empty search results
- Removed debug logging for clean console output
- Ensured RTL layout and Arabic language support maintained

### Homepage Redesign ✅
- **Replaced CategoryShowcase with ExpertSearch component**
- Homepage now features the intelligent search engine as the second section (after Hero)
- Users can search for experiences directly from the homepage
- Homepage shows maximum 6 curated results with "عرض الكل" button to view all
- Independent search states between homepage and experiences page (using queryKeyPrefix)
- Seamless SPA navigation using wouter Link component
- Maintained all homepage sections: Hero, ExpertSearch (new), FeaturedExperiences, HowItWorks, Stats, MentorSpotlight, CTASection

### Technical Architecture
- **useExperienceSearch hook**: Shared hook for search logic across pages
  - Supports `limit` option for result pagination
  - Supports `queryKeyPrefix` for independent search states
  - Custom fetch with no caching for multi-user consistency
  - Returns `experiences`, `totalCount`, `isLoading`, `clearSearch`
- **ExpertSearch component**: Lightweight search UI for homepage (limit: 6)
- **BookExperience page**: Full search experience (no limit)
- **Navigation**: Uses wouter Link for client-side routing (no page reloads)
- **Status**: Ready for production publishing