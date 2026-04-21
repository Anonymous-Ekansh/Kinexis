# Kinexis

**Your campus network — built for every stream and every batch.**

Kinexis is a student-first social platform for college communities. It connects students across departments, batches and interests — and gives clubs a real infrastructure to reach the people who follow them.

Live at **[kinexis.in](https://kinexis.in)**

---

## Features

| Feature | Description |
|---|---|
| **Discover** | Browse students by department, year and interest. Follow anyone. |
| **Channels** | Follow clubs and get their posts, events and announcements in one feed. |
| **Events** | Campus-wide event calendar, automatically populated from club emails. |
| **Campus Feed** | Threads, confessions, memes, professor reviews — anonymous posting supported. |
| **Collabs** | Post what you want to build. Find teammates, co-founders, partners. |
| **Messaging** | Request-based DMs — send an intro, chat opens when accepted. |

---

## Tech stack

### Frontend
- **Next.js 16** — App Router
- **React 19**
- **TypeScript**
- **Tailwind CSS v4**
- **Framer Motion**
- **Lucide React** — icons

### Backend & Infrastructure
- **Supabase** — Postgres, Auth (Google OAuth), Realtime, Edge Functions, Row Level Security
- **Google Apps Script** — automated email ingestion pipeline (runs every 15 minutes)

---

## Project structure

```
src/
├── app/                          # Next.js App Router
│   ├── auth/
│   │   ├── callback/             # OAuth callback handler
│   │   └── signout/
│   ├── channels/                 # Club channels and post feed
│   ├── clubs/                    # Club directory
│   ├── collabs/                  # Collaboration board
│   ├── discover/                 # Student discovery
│   ├── events/                   # Campus events calendar
│   ├── feed/                     # Campus Feed
│   ├── login/
│   ├── messages/                 # Messaging
│   ├── onboarding/
│   ├── profile/
│   └── signup/
│
├── components/
│   ├── clubs/
│   ├── discover/                 # ProfileCard, DiscoverFeed, FeaturedMatch, TeamCard etc.
│   ├── messages/                 # ChatPanel, MessageBubble, ConversationRow, RequestPanel etc.
│   ├── profile/
│   ├── providers/
│   └── shared/                   # TopNav, FollowButton
│
├── context/                      # React context providers
├── contexts/
├── data/                         # Mock data and constants
├── hooks/                        # Custom React hooks
└── lib/
    ├── channels/                 # Channel queries and realtime
    ├── messages/
    │   ├── crypto.ts             # Message encryption
    │   ├── queries.ts
    │   └── realtime.ts
    ├── logActivity.ts
    ├── server-fetchers.ts        # Server-side Supabase fetchers
    ├── supabase-server.ts        # SSR Supabase client
    └── supabase.ts               # Client-side Supabase client
```

---

## Database schema

| Table | Purpose |
|---|---|
| `users` | Student profiles — name, stream, batch, interests, bio |
| `follows` | Student follow graph |
| `social_links` | Profile social links |
| `user_presence` | Online/active status |
| `activity` | User activity log |
| `clubs` | Club directory |
| `club_members` | Club follow relationships and roles |
| `channel_posts` | All club posts — announcements and events |
| `email_club_mapping` | Maps sender email → club for ingestion pipeline |
| `events` | Structured event data — date, time, venue, type, entry |
| `event_interest` | Students who marked interest in an event |
| `rsvps` | Event RSVPs |
| `collabs` | Collaboration posts |
| `collab_requests` | Join requests for collabs |
| `collab_members` | Accepted collab members |
| `feed_posts` | Campus Feed posts — threads, confessions, memes |
| `feed_comments` | Comments on feed posts |
| `feed_votes` | Upvotes/downvotes on feed posts |
| `post_reactions` | Emoji reactions on channel posts |
| `conversations` | Direct message threads |
| `messages` | Individual messages within conversations |
| `message_requests` | Intro-based connection requests |
| `blocked_users` | Block relationships |

All tables have Row Level Security enabled.

---

## Email ingestion pipeline

Club emails → Google Apps Script (every 15 min) → parses date, time, venue, entry type, form link → Supabase Edge Function → `channel_posts` + `events` tables.

The parser handles real-world email formats — emoji date markers, HTML entities, ordinal dates, IST/UTC normalisation across 7 fallback extraction patterns.

---

## Local development

```bash
npm install
npm run dev
```

Environment variables needed: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Deploy the edge function:
```bash
supabase functions deploy ingest-club-email
```

---

*Kinexis — Meet the people who will build your future with you.*
