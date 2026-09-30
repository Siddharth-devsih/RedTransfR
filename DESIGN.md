# BloodConnect — Design (UI/UX)

**Status:** Design proposal. No UI implemented yet. This document describes intended screens, flows, and visual language for the React frontend.

---

## 1. Design Goals

1. **Emergency-first:** a stressed user must raise a request in < 60 seconds with minimal typing.
2. **Trust & clarity:** exact vs compatible matches, distance/ETA, and medical disclaimers must be unmistakable.
3. **Map as helper, not gimmick:** list-first with map alongside; works without Maps (fallback badges).
4. **Mobile-first:** most emergency use is on phones; desktop enhances with side-by-side map.
5. **Inclusive:** large touch targets, high contrast, works on low bandwidth (lazy-load maps).

---

## 2. Users & Scenarios

| User | Goal | Key scenario |
|---|---|---|
| Requester (patient family) | Find donor fast | "Need B+ urgently at City Hospital — show nearest available donors + ETA" |
| Donor | Stay discoverable, control privacy | "Register once, toggle availability off after donating" |
| Foundation / NGO | Fill donation camps | "Publish Sunday camp with venue map; track RSVPs" |
| Guest visitor | Browse / join | "See nearby campaigns; raise a request without full signup" |

---

## 3. Information Architecture / Routes (Planned)

```text
/                       Home (hero + emergency CTA + how it works + campaigns preview)
/request/new            Raise blood request (guest-friendly, 1 page)
/request/:id            Request detail + ranked donor list + map
/request/:id/status     Status tracker (pending → contacted → fulfilled/cancelled)
/donors/register        Donor registration
/donors/me              Donor profile + availability toggle + donation history
/campaigns              Campaign feed (search, city/date filter, map pins)
/campaigns/:id          Campaign detail + RSVP
/foundations/dashboard  Foundation: my campaigns, create/edit, RSVP list
/login, /register       Auth
/about                  Compatibility info + medical disclaimer
```

Nav (mobile bottom bar, desktop top bar): **Home | Request | Donors | Campaigns | Profile**.

---

## 4. Key Screens & Flows

### 4.1 Home (`/`)
- Hero: "Find blood donors near you, faster." + two CTAs: **[Request Blood — red]** **[Become a Donor — outline]**.
- Urgency strip: 3 steps (Request → Match → Contact) with icons.
- Live-feel stats (planned, from API later): requests fulfilled, donors registered, active campaigns.
- Campaign preview cards (3) → link to `/campaigns`.
- Footer disclaimer: matches are not medical clearance.

### 4.2 Raise Request (`/request/new`) — the critical flow
Single-page form, large inputs, sensible defaults:
- Blood group (8-button grid, required) — big tap targets.
- Hospital name + address autocomplete (Geocoding) + "Use my location" button.
- Units (stepper, default 1), Urgency (segmented: Normal / Urgent / Critical with color + helper text), Needed-by (date).
- Contact phone (required, 10-digit validation), note (optional).
- Submit → creates request → redirects to `/request/:id` with skeleton → match list streams in.
- Validation inline; preserves input on error; works without JS-map (address text accepted, geocoded server-side).

### 4.3 Request Detail + Matches (`/request/:id`)
Layout: **list-first, map alongside** (stacked on mobile, split on desktop).
- Header card: blood group badge, hospital, urgency pill, units, status pill, contact button.
- Match list rows: rank #, blood group (Exact / Compatible badge), masked phone, distance + ETA (`2.3 km · ~9 min`), availability age (`updated 2d ago`), **[Show route]** + **[Contact]** buttons.
- Map: hospital pin (red cross) + donor pins (numbered, approximate); selecting a row highlights pin + draws route polyline; ETA label.
- Empty state: "No donors within X km" + buttons: widen radius (critical), view nearby campaigns, edit request.
- Fallback state: if Maps unavailable, rows show `~3.1 km (straight-line)` badge.
- Status actions: `Mark contacted / Fulfilled / Cancel`.

### 4.4 Donor Registration & Profile
- Register: name, blood group (grid), phone (OTP planned future — v1: format validation only), address + map picker, availability toggle (default ON), last donation date.
- Profile (`/donors/me`): big availability switch, "I donated — pause for 90 days" shortcut, edit location, donation history.
- Privacy copy: "Your exact address is never shown publicly — only an approximate area until you agree to be contacted."

### 4.5 Campaigns
- Feed (`/campaigns`): search box, city dropdown, date range, cards with banner, title, venue, date/time, distance, RSVP count, **[Join]**.
- Detail (`/campaigns/:id`): banner, description, venue mini-map, organizer contact, RSVP list count, **[RSVP / Leave]**.
- Foundation dashboard: table of campaigns (date, RSVPs, published toggle), create/edit form (title, banner upload URL v1, venue + map picker, start/end, target units).
- Unverified foundations: "Pending verification" state; campaigns hidden until approved.

---

## 5. Design System (Proposed)

### 5.1 Colors
| Token | Value | Use |
|---|---|---|
| `--red-600` | `#DC2626` | Primary CTA, urgency critical, blood badges |
| `--red-700` | `#B91C1C` | Hover / pressed |
| `--amber-500` | `#F59E0B` | Urgent pill, warnings |
| `--green-600` | `#16A34A` | Available, fulfilled, success |
| `--slate-900` | `#0F172A` | Headings |
| `--slate-500` | `#64748B` | Secondary text |
| `--bg` | `#FFFFFF` / `#F8FAFC` | Surface / app background |

Urgency pills: Normal = slate, Urgent = amber, Critical = red (with pulse animation on critical only).

### 5.2 Typography & Spacing
- Font: Inter (system fallback) — headings 600/700, body 400/500.
- Scale: Hero 32–40px mobile / 48px desktop; card titles 18px; body 15–16px; meta 13px.
- Radius 12px cards, 8px inputs; 16px page padding mobile, max-width 1120px desktop.
- Touch targets ≥ 44px; form inputs ≥ 48px height.

### 5.3 Components (to build in React)
- `BloodGroupPicker` (8-button grid), `UrgencySegment`, `PhoneInput`, `LocationPicker` (autocomplete + map pin), `DonorCard`, `MatchRow`, `MapPanel` (lazy-loaded), `StatusPill`, `CampaignCard`, `EmptyState`, `DisclaimerBanner`.
- Map pins: numbered circles (donors), hospital = red cross in white circle; approximate-area halo for donor privacy.

### 5.4 Accessibility
- Color never sole carrier (urgency also has label + icon).
- Focus-visible rings; form errors announced (`aria-describedby`); map has list equivalent (all info in rows).
- Contrast ≥ 4.5:1 for body text; red-on-white checked.

---

## 6. UX Details & Edge Cases

- **Loading:** match list skeleton rows (3) + map shimmer; stream results (haversine first, ETA upgrades in place).
- **Errors:** geocode fail → keep typed address, flag "location approximate"; Maps quota → fallback badge, no hard failure.
- **Privacy:** exact coords never in client bundle for other users; masked phones; "Report incorrect info" link per row (future moderation).
- **Low bandwidth:** map lazy-loads only when scrolled into view / tab selected; list works first.
- **Copy tone:** calm, direct. e.g., empty state: "No available B+ donors within 15 km right now. Try widening the search or check nearby donation camps."

---

## 7. Wireframe Sketches (Text)

### Mobile — Request detail
```text
┌─────────────────────┐
│ B+ needed · URGENT   │  header card
│ City Hospital · 2u   │
│ [Contact] [Fulfilled]│
├─────────────────────┤
│ ① O- · Exact? no…   │  match rows
│    2.3km · ~9min     │
│    [Route] [Contact] │
│ ② B+ · Exact ✓      │
│    3.1km · ~12min    │
├─────────────────────┤
│ [ Map — pins ① ② ✚ ] │  collapsible map
└─────────────────────┘
```

### Desktop — Request detail
```text
┌──────────────┬──────────────────┐
│ header card  │                  │
├──────────────┤   Map + route    │
│ match rows   │   pins ①② ✚      │
│ ① ② ③ …      │                  │
└──────────────┴──────────────────┘
```

---

## 8. What Is NOT Designed Yet

- Notification system UI (SMS/push) — out of scope v1.
- Admin moderation console — placeholder only.
- Multi-language support — copy in English first.
- Dark mode — consider after v1.

---

## 9. Build Checklist (Frontend Order)

1. Static shell: nav, home, disclaimer, design tokens (Tailwind).
2. Request form + validation (no map).
3. Request detail list (mock data) + status actions.
4. Donor register/profile forms.
5. Map integration (display → pins → routes → fallback badge).
6. Campaigns feed/detail/RSVP + foundation dashboard.
7. Polish: skeletons, empty states, a11y pass, mobile QA.
