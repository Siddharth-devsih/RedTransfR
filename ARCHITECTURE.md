# BloodConnect — Architecture

**Status:** Design document. No code implemented yet. This describes the *intended* architecture for the MERN + Google Maps Platform system.

---

## 1. Goals & Constraints

### Functional goals
1. Register / update donor profiles (blood group, location, availability).
2. Raise and manage emergency blood requests with urgency levels.
3. Match requests to donors ranked by compatibility → availability → distance/ETA → urgency.
4. Show donors and hospitals on a map with distance, ETA, and routes.
5. Let verified foundations publish blood-donation campaigns; let users discover and join them.

### Non-functional goals
- **Response time:** match query p95 < 2s for ~10k donors (before Maps enrichment).
- **Accuracy:** never show medically incompatible groups as compatible.
- **Privacy:** no exact donor addresses on public map; phone numbers masked until mutual consent (design intent).
- **Cost control:** minimize Google Maps Platform calls via caching and radius pre-filtering.
- **Simplicity:** monolithic Express API + single React SPA for v1 (student-maintainable).

### Explicit non-goals (v1)
- No automated SMS/push notifications (manual contact via displayed info only).
- No in-app chat, payments, or hospital EMR integration.
- No ML-based prediction; ranking is rule-based.

---

## 2. System Overview

```text
                ┌──────────────┐
                │  React SPA   │  Requester, Donor, Foundation UIs
                │  (Vite +     │  + Maps JavaScript API (map, markers,
                │  Tailwind)   │    routes display)
                └──────┬───────┘
                       │ HTTPS / JSON (JWT auth)
                ┌──────▼───────┐
                │ Express API  │
                │  Node.js     │
                │  ┌─────────┐ │
                │  │Matching │ │  Compatibility filter → availability
                │  │Service  │ │  → geo pre-filter → Maps enrich → rank
                │  └─────────┘ │
                │  ┌─────────┐ │
                │  │ Maps    │ │  Geocode, Distance Matrix / Routes
                │  │ Service │ │  + server-side cache
                │  └─────────┘ │
                └──┬───────┬───┘
                   │       │ Geocode / Distance / ETA
            ┌──────▼──┐ ┌──▼──────────────────┐
            │ MongoDB │ │ Google Maps Platform│
            │(Mongoose)│ │ JS API, Geocoding,  │
            │         │ │ Distance Matrix /   │
            │         │ │ Routes API          │
            └─────────┘ └─────────────────────┘
```

### Component responsibilities

| Component | Responsibility |
|---|---|
| React SPA | Forms (donor register, request, campaign), search/filter UI, map view, dashboards |
| Express API | Validation, auth (JWT), CRUD, matching orchestration, campaign management |
| Matching Service | Pure ranking logic; unit-testable without Maps/DB |
| Maps Service | All Google Maps calls; caching; graceful fallback to straight-line distance |
| MongoDB | Persistent store: users, donors, requests, campaigns, RSVPs |

---

## 3. Data Flow

### 3.1 Raise request → match → contact

```text
1. Requester POST /api/requests { bloodGroup, hospitalLat/Lng, units, urgency, contact }
2. API validates (blood group enum, coords, urgency) → saves BloodRequest (status=pending)
3. API calls Matching Service with request + donor pool
     a. Compatibility filter (matrix in README §5)
     b. Availability filter (isAvailable=true, lastDonation older than MIN_GAP_DAYS)
     c. Geo pre-filter (haversine ≤ radiusByUrgency: normal 15km / urgent 30km / critical 50km)
     d. Maps enrich (distance + ETA for top-N, e.g., 20 nearest; cache 24h per origin-destination pair)
     e. Rank: exact-group first → compatible → ETA asc → distance asc
4. GET /api/requests/:id/matches returns ranked list (donorId, group, approxDistance, eta, availability)
5. Requester contacts donor out-of-band → PATCH /api/requests/:id { status: contacted → fulfilled | cancelled }
```

### 3.2 Campaign flow

```text
1. Foundation registers → admin marks verified (v1: manual flag) → POST /api/campaigns
2. Public GET /api/campaigns?city=&from=&to= → feed + map pins
3. User POST /api/campaigns/:id/rsvp → RSVP stored, count incremented
4. Foundation GET /api/campaigns/mine → manage + RSVP list
```

---

## 4. API Design (Planned, v1)

Base: `/api`. Auth: JWT Bearer for write routes; public read for campaigns and (rate-limited) match queries.

### Donors
- `POST /api/donors` — register donor (auth: user). Body: `{ name, bloodGroup, phone, location: { lat, lng, address }, isAvailable }`
- `GET /api/donors/me` — own profile
- `PATCH /api/donors/me` — update availability / location / lastDonationDate

### Requests
- `POST /api/requests` — create request. Body: `{ bloodGroupNeeded, hospitalName, location: { lat, lng, address }, units, urgency: normal|urgent|critical, neededBy, contactPhone, note? }`
- `GET /api/requests/:id` — request detail (owner or public limited view)
- `GET /api/requests/:id/matches?limit=20` — ranked donors
- `PATCH /api/requests/:id` — update status `{ status: contacted|fulfilled|cancelled }`

### Campaigns
- `POST /api/campaigns` — (verified foundation) `{ title, description, bannerUrl?, venue, location: { lat, lng }, startsAt, endsAt, targetUnits?, contactPhone }`
- `GET /api/campaigns?city=&from=&to=&q=` — public list
- `GET /api/campaigns/:id` — detail + RSVP count
- `POST /api/campaigns/:id/rsvp` — join (auth: user)
- `DELETE /api/campaigns/:id/rsvp` — leave
- `GET /api/foundations/mine/campaigns` — organizer dashboard

### Common conventions
- Errors: `{ error: { code, message, details? } }` with proper HTTP codes (400/401/403/404/429/500).
- Pagination: `?page=&limit=` → `{ data, page, total }`.
- Rate limit match + campaign-creation endpoints (abuse + Maps cost protection).

---

## 5. Data Models (Planned — Mongoose)

### 5.1 User
```js
{
  name: String (required),
  email: { type: String, unique, required },
  passwordHash: String (required, bcrypt),
  role: Enum['donor', 'requester', 'foundation', 'admin'], default 'donor',
  phone: String,
  createdAt, updatedAt
}
```

### 5.2 DonorProfile (1:1 with User)
```js
{
  userId: { type: ObjectId, ref: 'User', unique, required },
  bloodGroup: Enum['O-','O+','A-','A+','B-','B+','AB-','AB+'], required,
  phone: String, required,
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: [Number], // [lng, lat], 2dsphere index
    address: String
  },
  isAvailable: { type: Boolean, default: true },
  lastDonationDate: Date,
  createdAt, updatedAt
}
// Indexes: { location: '2dsphere' }, { bloodGroup: 1, isAvailable: 1 }
```

### 5.3 BloodRequest
```js
{
  requesterId: { type: ObjectId, ref: 'User' },   // nullable for guest requests (v1 allows guest + phone)
  bloodGroupNeeded: Enum[blood groups], required,
  hospitalName: String, required,
  location: { type: Point, coordinates: [lng, lat], address: String }, required,
  units: { type: Number, min: 1, default: 1 },
  urgency: Enum['normal','urgent','critical'], default 'normal',
  neededBy: Date,
  contactPhone: String, required,
  note: String,
  status: Enum['pending','contacted','fulfilled','cancelled','expired'], default 'pending',
  createdAt, updatedAt
}
// Indexes: { status: 1, createdAt: -1 }, { location: '2dsphere' }, TTL/partial index for expired cleanup (future)
```

### 5.4 Campaign + RSVP
```js
// Campaign
{
  foundationId: { type: ObjectId, ref: 'User', required },
  title: String, required,
  description: String, required,
  bannerUrl: String,
  venue: String, required,
  location: { type: Point, coordinates: [lng, lat], address: String },
  city: String, // denormalized for fast filtering
  startsAt: Date, required,
  endsAt: Date, required,
  targetUnits: Number,
  contactPhone: String, required,
  isPublished: { type: Boolean, default: true },
  rsvpCount: { type: Number, default: 0 },
  createdAt, updatedAt
}
// Indexes: { city: 1, startsAt: 1 }, { location: '2dsphere' }

// Rsvp
{
  campaignId: { type: ObjectId, ref: 'Campaign', required },
  userId: { type: ObjectId, ref: 'User', required },
  createdAt
}
// Unique compound index: { campaignId: 1, userId: 1 }
```

### 5.5 MatchCache (cost control)
```js
{
  originHash: String,   // donor approx location bucket
  destHash: String,     // hospital location bucket
  distanceMeters: Number,
  durationSeconds: Number,
  provider: String,     // 'google-routes' | 'haversine-fallback'
  expiresAt: Date       // TTL 24h
}
```

---

## 6. Matching Algorithm (Rule-Based, v1)

Pseudocode for `rankDonors(request, donors)`:

```text
COMPAT = { 'O-':['O-'], 'O+':['O-','O+'], ... }  // see README §5
RADIUS = { normal: 15km, urgent: 30km, critical: 50km }

1. pool = donors where bloodGroup in COMPAT[request.group]
                      AND isAvailable
                      AND (now - lastDonationDate) >= MIN_GAP_DAYS (e.g., 90)
2. pool = pool where haversine(donor, hospital) <= RADIUS[request.urgency]
3. sort pool by haversine asc → take top N (N=20) for Maps enrichment
4. for each: (dist, eta) = mapsCache.get() ?? maps.distanceMatrix() ?? haversine fallback
5. score: exactGroup (0) < compatible (1); then eta asc; then dist asc
6. return sorted list with { donorId, bloodGroup, isExact, distanceKm, etaMin, provider }
```

Why two-stage (haversine pre-filter → Maps for top-N)? Distance Matrix / Routes calls cost money and add latency. Haversine via MongoDB `$near` is free and fast; Maps is reserved for the shortlist the user actually sees.

Edge cases:
- No donors in radius → return empty + suggest: widen radius (critical), show campaigns nearby.
- Maps quota error → fall back to haversine with `provider: 'haversine-fallback'` and a UI badge.
- Stale donor location → `updatedAt` shown; requester confirms by phone.

---

## 7. Google Maps Platform Usage (Planned)

| API | Use |
|---|---|
| Maps JavaScript API | Map, donor/hospital markers, route polyline |
| Geocoding API | Convert typed hospital/venue addresses → lat/lng (server-side) |
| Distance Matrix or Routes API | Donor→hospital distance + ETA (server-side, cached) |

Keys: browser key (restricted by HTTP referrer) + server key (restricted by IP, stored in env). Never commit keys. Approximate donor coordinates (geohash bucket ~500m) sent to client.

---

## 8. Security & Privacy (Design Intent)

- Passwords: bcrypt hash; JWT expiry (e.g., 7d); server-side validation on every write.
- Phone masking: match list returns masked phone (`98XXXXXX10`) until donor confirms / requester is rate-limited and logged (full design in `DESIGN.md`).
- NoSQL injection: Mongoose schema types + allow-list query params.
- Abuse: rate limits on `POST /requests`, `GET /matches`, `POST /campaigns`; CAPTCHA on guest request form (future).
- Foundation verification: manual `isVerified` flag in v1; unverified campaigns hidden.

---

## 9. Scalability & Ops (v1 → future)

- v1: single Express process + MongoDB Atlas; stateless (JWT) so horizontal scaling is trivial later.
- Indexes (§5) keep `$near` + group filters fast to ~100k donors.
- MatchCache TTL + top-N enrichment bound Maps cost regardless of donor count.
- Future: Redis for MatchCache, background worker for expiry (`expired` status), CDN for campaign banners, pagination/virtualized lists.

---

## 10. Testing Strategy (Planned)

- Unit: compatibility matrix (all 8 recipient groups), ranking comparator, haversine math.
- API: supertest for donor/request/campaign CRUD + auth guards + validation errors.
- Manual: seed 20 donors across a city, raise urgent vs normal requests, verify radius + ordering changes; disable Maps key to verify fallback badge.

---

## 11. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Maps cost / quota exhaustion | Top-N enrichment, 24h cache, haversine fallback |
| Inaccurate donor location | Show `updatedAt`; confirm by phone; allow easy profile update |
| Fake / spam requests | Rate limit, phone required, report button (future), expiry |
| Medical misuse (treating match as clearance) | Disclaimer in UI + README; exact-vs-compatible labeling; hospital decides |
| Privacy leak (home address) | Approximate pins; masked phones; minimal public fields |

---

## 12. Build Order (Suggested)

1. Auth + Donor CRUD + Request CRUD (no maps).
2. Compatibility filter + haversine `$near` ranking.
3. Map display + geocoding.
4. Distance/ETA enrichment + cache + fallback.
5. Campaigns + RSVP.
6. Polish: statuses, validation, rate limits, seed data, docs update.
