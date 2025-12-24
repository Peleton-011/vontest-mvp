# Games App Separation Guide

## Executive Summary

This document outlines strategies for separating the social games functionality from the main Vontest platform into a standalone application. The goal is to create an independent games app while maintaining code reusability and potential integration points.

---

## Current Architecture Analysis

### Monolithic Structure
Currently, the games module exists within a single Nuxt 3 application alongside other features (debates, proposals, etc.):

```
vontest-mvp/
├── components/
│   ├── games/          # Game-specific components
│   ├── Form/           # Shared form components
│   └── ui/             # Shared UI components
├── composables/
│   ├── games/          # Game-specific composables
│   └── [shared]        # Shared composables
├── pages/
│   ├── games/          # Game routes
│   ├── proposals/      # Debate routes
│   └── profile/        # User routes
├── supabase/
│   └── migrations/     # Database schema (mixed concerns)
└── types/
    ├── games.ts        # Game types
    └── supabase.ts     # All DB types
```

### Games Module Dependencies

#### Self-Contained (Easy to Extract)
- ✅ `components/games/*` - All game UI components
- ✅ `composables/games/*` - All game logic
- ✅ `pages/games/*` - All game routes
- ✅ `types/games.ts` - Game type definitions

#### Shared Dependencies (Need Duplication or Abstraction)
- ⚠️ `components/ui/ChatSection.vue` - Used by games for chat
- ⚠️ `components/Form/*` - Form components used in games
- ⚠️ `composables/useComments.ts` - Chat/comment system
- ⚠️ Authentication system (Supabase Auth)
- ⚠️ Database access (Supabase client)

#### Database Schema (Requires Careful Separation)
- ⚠️ Shared tables: `profiles`, `threads`, `comments`
- ✅ Games-only tables: `groups`, `group_members`, `game_instances`, `game_responses`, etc.
- ⚠️ Mixed migrations (some touch shared tables)

---

## Separation Strategies

### Option 1: Standalone Nuxt App (Recommended)

Create a completely separate Nuxt 3 application for games with its own deployment.

#### Architecture
```
vontest-mvp/              # Original app (debates, proposals)
vontest-games/            # New standalone games app
shared-lib/               # Optional shared library
```

#### Pros
- ✅ Complete independence (deploy separately)
- ✅ Different scaling strategies possible
- ✅ Separate teams can work independently
- ✅ Different tech stacks possible in future
- ✅ Cleaner codebase per app

#### Cons
- ❌ Code duplication for shared components
- ❌ Need to maintain two apps
- ❌ Shared database schema requires coordination
- ❌ User must switch between apps

#### Implementation Complexity: **Medium-High**

---

### Option 2: Monorepo with Workspaces

Keep both apps in one repository using npm/pnpm workspaces.

#### Architecture
```
vontest-monorepo/
├── apps/
│   ├── main/           # Original Vontest app
│   └── games/          # Games app
├── packages/
│   ├── ui/             # Shared UI components
│   ├── auth/           # Shared auth utilities
│   └── database/       # Shared database types/migrations
└── package.json        # Workspace configuration
```

#### Pros
- ✅ Code sharing via internal packages
- ✅ Single repository, easier to coordinate
- ✅ Shared tooling and CI/CD
- ✅ Type safety across apps
- ✅ DRY principle maintained

#### Cons
- ❌ More complex build setup
- ❌ Requires monorepo tooling (Turborepo, Nx)
- ❌ All devs need to understand monorepo structure
- ❌ Still need to manage two deployments

#### Implementation Complexity: **High**

---

### Option 3: Domain-Based Routing (Simplest)

Keep single app but use domain routing to separate concerns.

#### Architecture
```
games.vontest.com  → /games/* routes only
vontest.com        → Main app (debates, proposals)
```

#### Implementation
- Single codebase, single deployment
- Different domains/subdomains route to different entry points
- Use Nuxt layers or route-based code splitting

#### Pros
- ✅ Minimal code changes
- ✅ Easy to implement
- ✅ Shared database, no duplication
- ✅ Can split later if needed

#### Cons
- ❌ Still a monolith
- ❌ Cannot scale games independently
- ❌ Not truly separate apps
- ❌ Couples deployment cycles

#### Implementation Complexity: **Low**

---

### Option 4: Mobile App with Shared Backend

Create a native/hybrid mobile app for games, reuse Supabase backend.

#### Architecture
```
vontest-web/              # Web app (debates, proposals)
vontest-games-mobile/     # React Native / Flutter app
supabase/                 # Shared backend (existing)
```

#### Pros
- ✅ Better mobile UX for games
- ✅ Platform-specific features (push notifications, etc.)
- ✅ Reuse existing Supabase backend
- ✅ Web app stays focused on debates

#### Cons
- ❌ Need mobile dev expertise
- ❌ Maintain two completely different codebases
- ❌ Different deployment processes
- ❌ Higher development cost

#### Implementation Complexity: **Very High**

---

## Recommended Approach: Standalone Nuxt App

Based on the current codebase and requirements, **Option 1 (Standalone Nuxt App)** is recommended with these modifications:

### Phase 1: Shared Package Extraction (2-3 days)

Create a shared npm package for truly common code:

```bash
vontest-shared/
├── package.json
├── components/
│   ├── UButton.vue       # Generic UI (if not using Nuxt UI)
│   └── ChatSection.vue   # Shared chat component
├── composables/
│   ├── useAuth.ts        # Auth utilities
│   ├── useComments.ts    # Comment system
│   └── useSupabase.ts    # DB client setup
├── types/
│   └── supabase.ts       # Generated types
└── utils/
    └── validation.ts     # Shared utilities
```

**Changes Required:**
1. Extract shared components to `vontest-shared` package
2. Publish to private npm registry or use git dependencies
3. Import in both apps: `import { ChatSection } from 'vontest-shared'`

### Phase 2: Games App Creation (3-5 days)

Create new Nuxt 3 app with games code:

```bash
vontest-games/
├── nuxt.config.ts
├── components/games/      # Copy from current app
├── composables/games/     # Copy from current app
├── pages/
│   ├── index.vue         # Landing page
│   ├── [groupId]/        # Group pages
│   └── new.vue           # Create group
├── layouts/
│   └── default.vue       # Games-specific layout
└── types/
    └── games.ts          # Copy from current app
```

**Changes Required:**
1. Copy all `components/games/*` → new app
2. Copy all `composables/games/*` → new app
3. Copy all `pages/games/*` → `pages/*` in new app
4. Copy `types/games.ts` → new app
5. Install `vontest-shared` as dependency
6. Configure Supabase client (same project, same tables)

### Phase 3: Database Schema Strategy (1-2 days)

**Option A: Shared Database (Recommended)**
- Both apps use same Supabase project
- Games app only queries games-related tables
- Main app ignores games tables
- Migrations stay in one place (coordinate changes)

```typescript
// vontest-games/supabase/types.ts (generated)
// Only includes games-related table types

// vontest-mvp/supabase/types.ts (generated)
// Only includes debates-related table types
```

**Option B: Separate Databases**
- Create new Supabase project for games
- Migrate games tables to new project
- Requires user table sync or federation
- More complex but fully independent

**Changes Required (Option A):**
1. Keep existing Supabase project
2. Generate filtered types for each app
3. Document which tables belong to which app
4. Create RLS policies that namespace by app

**Changes Required (Option B):**
1. Create new Supabase project
2. Copy games migrations to new project
3. Implement user profile sync between databases
4. Update RLS policies for new structure

### Phase 4: Authentication Bridge (2-3 days)

Both apps need to share authentication.

**Recommended: Shared Supabase Auth**
```typescript
// Both apps use same Supabase project for auth
// User signs in once, works in both apps
// Shared session cookies across subdomains

// vontest.com
// games.vontest.com
// Both share *.vontest.com cookies
```

**Changes Required:**
1. Configure Supabase Auth URLs to allow both domains
2. Set cookie domain to `.vontest.com`
3. Implement SSO flow if using separate databases
4. Share JWT signing keys

### Phase 5: Deployment Strategy (1-2 days)

**Separate Deployments:**
```
Vercel Project 1: vontest-mvp → vontest.com
Vercel Project 2: vontest-games → games.vontest.com
```

**Changes Required:**
1. Create new Vercel project for games app
2. Configure environment variables (Supabase keys, etc.)
3. Set up CI/CD for games app
4. Configure DNS for games subdomain
5. Update CORS settings in Supabase

---

## Detailed Changes Required

### 1. Create Shared Package

**New File: `vontest-shared/package.json`**
```json
{
  "name": "vontest-shared",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    "./components/*": "./components/*",
    "./composables/*": "./composables/*",
    "./types/*": "./types/*",
    "./utils/*": "./utils/*"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "vue": "^3.3.0"
  }
}
```

**Files to Move:**
- `components/ui/ChatSection.vue` → `vontest-shared/components/ChatSection.vue`
- `composables/useComments.ts` → `vontest-shared/composables/useComments.ts`
- `utils/commentTreeUtils.ts` → `vontest-shared/utils/commentTreeUtils.ts`

### 2. Games App Package.json

**New File: `vontest-games/package.json`**
```json
{
  "name": "vontest-games",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "nuxt dev",
    "build": "nuxt build",
    "generate": "nuxt generate",
    "preview": "nuxt preview"
  },
  "dependencies": {
    "@nuxt/ui": "^2.12.0",
    "@supabase/supabase-js": "^2.39.0",
    "nuxt": "^3.10.0",
    "vontest-shared": "file:../vontest-shared",
    "vue": "^3.3.0"
  }
}
```

### 3. Update Import Paths

**Before (in main app):**
```typescript
// components/games/ManagePromptsModal.vue
import { useComments } from '~/composables/useComments'
```

**After (in games app):**
```typescript
// components/games/ManagePromptsModal.vue
import { useComments } from 'vontest-shared/composables/useComments'
```

### 4. Nuxt Config for Games App

**New File: `vontest-games/nuxt.config.ts`**
```typescript
export default defineNuxtConfig({
  modules: ['@nuxt/ui'],

  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      appUrl: process.env.APP_URL || 'https://games.vontest.com'
    }
  },

  // Only import games-related types
  typescript: {
    typeCheck: true
  },

  // Games-specific routing
  routeRules: {
    '/': { redirect: '/games' } // Games home
  }
})
```

### 5. Database Type Generation

**vontest-games only needs games tables:**

```bash
# In vontest-games/
npx supabase gen types typescript \
  --project-id YOUR_PROJECT_ID \
  --schema public \
  > types/supabase.ts

# Then manually remove non-games tables or use filtering
```

### 6. Update Migrations Location

**Keep migrations in main app, coordinate:**
```bash
vontest-mvp/supabase/migrations/  # All migrations stay here
# Both apps read from same Supabase project
# Document which migrations affect which app
```

**Or split migrations:**
```bash
vontest-mvp/supabase/migrations/     # Debates-only
vontest-games/supabase/migrations/   # Games-only
shared-migrations/                   # Shared tables (profiles, etc.)
```

### 7. Authentication Flow

**Both apps share auth state:**

```typescript
// vontest-games/composables/useAuth.ts
import { createClient } from '@supabase/supabase-js'

export const useAuth = () => {
  const supabase = createClient(
    runtimeConfig.public.supabaseUrl,
    runtimeConfig.public.supabaseAnonKey,
    {
      auth: {
        // Share auth across subdomains
        storage: cookieStorage,
        storageKey: 'vontest-auth', // Same key as main app
        flowType: 'pkce',
        autoRefreshToken: true,
        persistSession: true
      }
    }
  )

  // Rest of auth logic
}
```

### 8. Cross-App Navigation

**Link from main app to games:**
```vue
<!-- vontest-mvp/components/Navbar.vue -->
<template>
  <UButton
    to="https://games.vontest.com"
    external
    target="_blank"
  >
    Play Games
  </UButton>
</template>
```

**Link from games to main app:**
```vue
<!-- vontest-games/components/Navbar.vue -->
<template>
  <UButton
    to="https://vontest.com/proposals"
    external
  >
    Back to Vontest
  </UButton>
</template>
```

---

## Migration Path

### Step-by-Step Implementation

#### Week 1: Preparation
1. ✅ Identify all shared code
2. ✅ Create `vontest-shared` package structure
3. ✅ Move shared components/composables
4. ✅ Test shared package locally
5. ✅ Update main app to use shared package

#### Week 2: Games App Setup
1. ✅ Create new `vontest-games` Nuxt app
2. ✅ Copy games components/composables
3. ✅ Install `vontest-shared` dependency
4. ✅ Update import paths
5. ✅ Configure Supabase client
6. ✅ Test locally

#### Week 3: Database & Auth
1. ✅ Decide on shared vs separate database
2. ✅ Generate appropriate types for each app
3. ✅ Configure auth to work across both apps
4. ✅ Test user sessions across apps
5. ✅ Document RLS policy ownership

#### Week 4: Deployment
1. ✅ Set up Vercel project for games app
2. ✅ Configure environment variables
3. ✅ Set up DNS for games.vontest.com
4. ✅ Deploy to staging
5. ✅ Test cross-app functionality
6. ✅ Deploy to production

#### Week 5: Cleanup
1. ✅ Remove games code from main app
2. ✅ Update navigation links
3. ✅ Update documentation
4. ✅ Monitor for issues
5. ✅ Collect user feedback

---

## Alternative: Gradual Migration

If immediate separation is too risky, use gradual approach:

### Phase 1: Namespace Routes (1 day)
Keep monolith but clearly separate routes:
```
vontest.com/games/*     # Will become games.vontest.com
vontest.com/proposals/* # Stays on main domain
```

### Phase 2: Code Organization (1 week)
Reorganize to make extraction easier:
```bash
apps/
├── main/        # Main app code
└── games/       # Games code (still in monolith)
```

### Phase 3: Feature Flags (1 week)
Add feature flags to control which app serves what:
```typescript
if (isGamesRequest) {
  // Serve from games module
} else {
  // Serve from main module
}
```

### Phase 4: Extract (2-3 weeks)
Follow full separation process when ready.

---

## Risk Assessment

### Low Risk ✅
- Creating separate Nuxt app (can coexist)
- Shared database with same Supabase project
- Subdomain routing (games.vontest.com)

### Medium Risk ⚠️
- Moving shared code to package (test thoroughly)
- Cross-app authentication (need proper testing)
- Coordinating database migrations

### High Risk ❌
- Splitting database into separate projects
- Changing auth flow significantly
- Removing games from main app before new app ready

---

## Testing Strategy

### Before Separation
- [ ] Document all games functionality
- [ ] Create end-to-end test suite
- [ ] Test all games with real users
- [ ] Backup database

### During Development
- [ ] Test shared package in isolation
- [ ] Test games app independently
- [ ] Test authentication flow across apps
- [ ] Test database access patterns

### Before Production
- [ ] Load testing on games app
- [ ] Security audit (especially auth)
- [ ] Cross-app integration testing
- [ ] Rollback plan documented

---

## Cost Analysis

### Development Time
- **Shared Package**: 2-3 days
- **Games App Creation**: 3-5 days
- **Database Strategy**: 1-2 days
- **Authentication**: 2-3 days
- **Deployment Setup**: 1-2 days
- **Testing & QA**: 3-5 days
- **Total**: 12-20 days (2.5-4 weeks)

### Infrastructure Costs
- **Same Database**: $0 additional (reuse Supabase project)
- **Separate Deployment**: ~$20/month (Vercel Pro)
- **CDN**: Included in Vercel
- **Total Additional**: ~$20-40/month

### Maintenance Costs
- Two codebases to maintain
- Coordinated deployments
- Shared dependency updates
- Estimated: +30% ongoing development time

---

## Rollback Plan

If separation fails or causes issues:

1. **Keep main app unchanged** until games app proven
2. **Feature flag** to redirect games.vontest.com → vontest.com/games
3. **Database unchanged** so no data migration needed
4. **Gradual cutover** (10% traffic → 50% → 100%)
5. **Quick rollback**: DNS change (5 minutes)

---

## Decision Matrix

| Criteria | Standalone App | Monorepo | Domain Routing | Mobile App |
|----------|---------------|----------|----------------|------------|
| Independence | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| Code Reuse | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| Complexity | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ |
| Scalability | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Maintenance | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| Time to Ship | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ |

**Recommended**: Standalone App (good balance of independence and effort)

---

## Next Steps

1. **Review this document** with team
2. **Choose separation strategy**
3. **Create detailed implementation plan**
4. **Set up development environment**
5. **Begin with shared package extraction**
6. **Iterate and test frequently**

---

## Questions to Answer

Before proceeding, decide:

- [ ] Separate database or shared database?
- [ ] Publish shared package to npm or use git dependencies?
- [ ] Monorepo or separate repositories?
- [ ] Immediate separation or gradual migration?
- [ ] What's the timeline/deadline?
- [ ] Who will maintain each app?
- [ ] How to handle breaking changes in shared code?

---

## References

- [Nuxt 3 Layers](https://nuxt.com/docs/guide/going-further/layers)
- [Monorepo Setup](https://turbo.build/repo/docs)
- [Supabase Multi-Project Auth](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Domain-Based Routing](https://nuxt.com/docs/guide/going-further/runtime-config)

---

**Last Updated**: December 2024
**Status**: Planning Phase
**Recommendation**: Standalone Nuxt App with Shared Package
