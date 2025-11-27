# Experience Booking Application - Design Guidelines

## Design Approach

**Reference-Based Approach** drawing from marketplace leaders:
- **Airbnb**: Experience listing cards, trust elements, booking flow
- **Cal.com**: Calendar/availability interface patterns
- **Upwork**: Service provider profiles and credibility signals

**Core Principle**: Build trust through clarity, professionalism, and visual hierarchy that guides users from discovery to booking.

---

## Typography System

**Font Families** (Google Fonts):
- **Primary**: Inter (UI, body text, navigation)
- **Display**: Sora (hero headlines, experience titles)

**Hierarchy**:
- Hero Headline: 4xl-6xl, bold (Sora)
- Section Headers: 3xl-4xl, semibold (Sora)
- Experience Titles: xl-2xl, semibold (Sora)
- Body Text: base-lg, normal (Inter)
- Metadata: sm-base, medium (Inter)
- Micro-copy: xs-sm, normal (Inter)

---

## Layout System

**Spacing Primitives**: Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24
- Tight spacing: 2-4 (cards, inline elements)
- Standard: 6-8 (component padding)
- Generous: 12-16 (section padding)
- Hero sections: 20-24 (vertical rhythm)

**Container Widths**:
- Full-width hero: w-full with inner max-w-7xl
- Content sections: max-w-6xl
- Forms/booking flow: max-w-2xl

**Grid Patterns**:
- Experience listings: 3-column desktop (lg:grid-cols-3), 2-column tablet (md:grid-cols-2), single mobile
- Features: 3-column desktop, 2-column tablet
- Mentor profiles: Single column with sidebar layout

---

## Page Structure & Components

### Landing Page (6-8 Sections)

**Hero Section** (80vh):
- Large background image showing mentorship/learning moment (blurred overlay)
- Centered headline: "Learn From Real-Life Experiences"
- Subheadline explaining value proposition
- Primary CTA: "Browse Experiences" (blurred background button)
- Secondary CTA: "Become a Mentor"
- Trust indicator: "Join 5,000+ learners and 500+ mentors"

**Category Showcase** (grid):
- 6-8 category cards in 2-4 column grid
- Icon + category name + experience count
- Hover state with subtle elevation

**Featured Experiences**:
- 3-column grid of experience cards
- Each card: Mentor photo (circular), title, brief description (2 lines), price, rating stars, "View Details" link
- "See All Experiences" CTA

**How It Works**:
- 3-step process in horizontal layout
- Icon → Title → Short description for each step
- Visual connector lines between steps (desktop only)

**Mentor Spotlight**:
- 2-column alternating layout (image left/right)
- Large mentor photo, quote/testimonial, experience count, "View Profile" link
- 2-3 featured mentors

**Stats Section**:
- 4-column grid on desktop
- Large number + label (e.g., "500+ Mentors", "10,000+ Sessions", "4.9 Rating", "95% Satisfaction")

**Call-to-Action Section**:
- Centered content with supporting imagery
- "Ready to share your experience?" headline
- Description paragraph
- Primary button: "Create Your Listing"
- Supporting text: "Free to join, only pay when you book sessions"

**Footer**:
- 4-column layout: About, For Mentors, For Learners, Support
- Newsletter signup form
- Social media links
- Trust badges (secure payments, satisfaction guarantee)

---

### Experience Listing Page

**Filter Sidebar** (desktop) / Drawer (mobile):
- Category checkboxes
- Price range slider
- Rating filter
- Availability date picker
- "Apply Filters" button

**Main Content Area**:
- Search bar with keyword search
- Sort dropdown (Price, Rating, Popular, Newest)
- 3-column experience card grid
- Pagination at bottom

**Experience Card Design**:
- Aspect ratio image (16:9) showing experience context
- Mentor thumbnail (overlapping bottom left of image)
- Title (2-line truncate)
- Category badge
- Price (bold) + per session
- Star rating + review count
- Hover: Subtle shadow elevation, scale(1.02)

---

### Experience Detail Page

**Hero Section**:
- Full-width image showcase (if mentor provides experience photos)
- Experience title overlay
- Breadcrumb navigation

**2-Column Layout**:
Left (60%):
- Experience title (large)
- Mentor mini-profile (photo, name, "View Full Profile" link)
- Full description (multiple paragraphs)
- "What You'll Learn" bulleted list
- Reviews section (5 most recent, "See All Reviews" link)

Right (40%, sticky):
- Booking card (elevated shadow)
- Price display (large)
- Calendar widget showing available dates
- Time slot selector
- "Book Session" primary button
- Trust elements: "100% satisfaction guarantee", "Instant confirmation"

---

### Booking Flow

**Step 1: Select Date/Time** (modal or dedicated page)
- Large calendar with available dates highlighted
- Selected date shows time slots in grid
- Selected slot highlights

**Step 2: Confirm Details**:
- Session summary card
- Mentor info
- Date/time
- Price breakdown (session + fees)
- "Continue to Payment" button

**Step 3: Payment** (Stripe integration):
- Payment form
- Order summary sidebar (sticky)
- "Complete Booking" button

**Confirmation Page**:
- Success message with checkmark animation
- Session details card
- Calendar invite download
- Email confirmation sent message
- "View My Bookings" button
- "Book Another Session" secondary button

---

### User Dashboard

**Tabs Navigation**: Upcoming Sessions | Past Sessions | Saved Experiences

**Session Cards**:
- Horizontal card layout
- Mentor photo | Experience title | Date/time | Status badge
- Actions: "Join Session", "Reschedule", "Cancel", "Leave Review"

---

### Mentor Dashboard

**Stats Overview**:
- 4-card grid: Total Earnings, Sessions Booked, Avg Rating, Response Rate

**Tabs**: My Listings | Bookings | Availability | Earnings

**Listing Management**:
- Table view with edit/delete actions
- "Create New Experience" prominent button

---

## Images

**Hero Image**: Mentorship scene - two people engaged in learning/conversation, warm and professional setting. Place at top of landing page, full width, 80vh height.

**Category Cards**: Icon-based (no photos needed, use icon library)

**Experience Cards**: Context photos showing the experience field (e.g., perfume shop interior, travel adventure, workshop setting)

**Mentor Profiles**: Professional headshots, circular crop

**How It Works Section**: Illustration-style graphics or simple icons (no photos)

---

## Component Library

**Buttons**:
- Primary: Large, rounded-lg, semibold text, px-8 py-4
- Secondary: Outlined, same size
- Tertiary: Text-only with icon

**Cards**:
- Rounded-xl corners
- Subtle shadow (shadow-md)
- Hover elevation (shadow-lg)
- 4-6 padding

**Forms**:
- Input fields: rounded-lg, border, px-4 py-3
- Labels: semibold, mb-2
- Validation: Inline error messages below fields

**Navigation**:
- Fixed top navbar with logo, search, primary links, user menu
- Transparent on hero (desktop), solid on scroll
- Mobile: Hamburger menu

**Badges**: 
- Pill-shaped, small text, px-3 py-1

**Modals**:
- Centered, max-w-2xl, rounded-xl, p-6
- Backdrop blur overlay

---

## Accessibility & Polish

- Focus states: 2px ring offset for all interactive elements
- Consistent spacing rhythm throughout all pages
- Loading states: Skeleton screens for experience cards
- Empty states: Illustrations with helpful messaging
- Error handling: Inline validation with clear messaging
- Responsive breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)