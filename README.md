# Property Platform

Internal property management platform for managing LLCs, properties, tenants, payments, and legal cases.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS
- **Backend**: Firebase Cloud Functions
- **Database**: Firestore
- **Storage**: Firebase Cloud Storage (signed URLs)
- **Auth**: Firebase Authentication
- **Payments**: Stripe Connect (ACH + Card)

## Project Structure

```
property-platform/
├── apps/
│   └── web/                 # Next.js web application
├── functions/               # Firebase Cloud Functions
├── packages/
│   └── shared/              # Shared types, validators, utilities
├── emulators/               # Firebase emulator configs
├── firebase.json            # Firebase configuration
└── pnpm-workspace.yaml      # pnpm workspace config
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+
- Firebase CLI (`npm install -g firebase-tools`)

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment files
cp apps/web/.env.example apps/web/.env.local
cp functions/.env.example functions/.env

# Update .env files with your Firebase and Stripe credentials
```

### Development

```bash
# Start Next.js dev server
pnpm dev

# Start Firebase emulators (in another terminal)
pnpm emulators

# Build all packages
pnpm build

# Run linting
pnpm lint

# Type check
pnpm typecheck
```

### Deployment

```bash
# Deploy Cloud Functions
pnpm deploy:functions

# Deploy Firestore/Storage rules
pnpm deploy:rules
```

## Environment Variables

### Web App (`apps/web/.env.local`)

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

### Functions (`functions/.env`)

```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

## Architecture

See `/design` folder for detailed architecture documentation:

- `build-overview.md` - Project overview
- `implementation-plan.md` - Implementation roadmap
- `firestore-collections-blueprint.md` - Database schema
- `firestore-rules-blueprint.md` - Security rules
- `next-routes-map.md` - Route structure
