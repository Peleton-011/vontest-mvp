# Vontests Multi-Tenant SaaS Architecture Guide

## Executive Summary

This document analyzes architecture options for transforming Vontests (debates/proposals platform) into a multi-tenant SaaS offering where organizations can rent isolated instances with their own API keys and "fenced garden" environments.

**TL;DR Recommendation**: **Shared Database with Row-Level Security (RLS)** for most use cases, with option to upgrade large customers to dedicated databases.

---

## Current Architecture

### Monolithic Single-Tenant
```
Current Setup:
- Single Supabase project
- One database for all users
- No tenant isolation
- Shared authentication
```

### Tables in Scope (Debates/Proposals Only)
```
Core Tables to Isolate:
- vontests (debates)
- proposals
- votes
- comments/threads
- profiles (users)
- notifications
```

**Tables to Exclude** (These are games-specific):
- groups, group_members
- game_instances, game_responses, game_votes
- game_prompts, prompt_packages
- All games-related tables

---

## Multi-Tenancy Patterns

### Option 1: Database-per-Tenant (Silo Model)

Each organization gets a completely separate Supabase project.

#### Architecture
```
Organization A → Supabase Project A → Database A
Organization B → Supabase Project B → Database B
Organization C → Supabase Project C → Database C

Router/API Gateway:
- Routes requests based on API key
- Maps to correct Supabase project
```

#### Implementation
```typescript
// Central routing service
const getTenantDatabase = (apiKey: string) => {
  const tenant = lookupTenant(apiKey);

  return createClient(
    tenant.supabaseUrl,    // Unique per tenant
    tenant.supabaseKey     // Unique per tenant
  );
};

// Each request
app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  req.db = getTenantDatabase(apiKey);
  next();
});
```

#### Pros ✅
- **Complete data isolation** - Physically separate databases
- **No RLS complexity** - Each tenant has full database
- **Custom configuration** - Each tenant can have different settings
- **Performance isolation** - One tenant can't slow down others
- **Easier compliance** - Can host specific tenants in specific regions
- **Simple security model** - No risk of cross-tenant data leakage
- **Independent backups** - Can restore one tenant without affecting others
- **Easy to sunset** - Can delete entire database when tenant leaves

#### Cons ❌
- **High cost** - Supabase pricing per project (starts at $25/month each)
- **Management overhead** - Need to manage N databases
- **Schema migrations complex** - Must run migrations across all databases
- **No cross-tenant analytics** - Hard to generate platform-wide insights
- **Slower tenant provisioning** - Creating new Supabase project takes time
- **Connection pooling** - Each database needs its own connection pool

#### Cost Analysis (Supabase)
```
Per Tenant (Supabase Pro):
- $25/month base
- 8 GB database
- 50 GB bandwidth
- 250 GB egress

100 Tenants = $2,500/month base
500 Tenants = $12,500/month base
```

#### When to Use
- ✅ High-value enterprise customers
- ✅ Strict compliance requirements (HIPAA, SOC 2)
- ✅ Customers need dedicated resources
- ✅ Small number of large tenants (< 50)
- ❌ Large number of small tenants

---

### Option 2: Shared Database with Discriminator (Pool Model)

Single database with `organization_id` column in every table.

#### Architecture
```
All Organizations → Single Supabase Project → One Database

Data Model:
vontests:
  - id
  - organization_id  ← Discriminator
  - title
  - ...

proposals:
  - id
  - organization_id  ← Discriminator
  - vontest_id
  - ...
```

#### Implementation with RLS

**Database Schema Changes Required:**

```sql
-- Add organization_id to all tables
ALTER TABLE vontests ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE proposals ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE votes ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE comments ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE profiles ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- Create organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  api_key TEXT UNIQUE NOT NULL,
  api_secret TEXT NOT NULL, -- Hashed
  plan TEXT NOT NULL, -- 'free', 'pro', 'enterprise'
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  active BOOLEAN DEFAULT true
);

-- Create indexes for performance
CREATE INDEX idx_vontests_org ON vontests(organization_id);
CREATE INDEX idx_proposals_org ON proposals(organization_id);
CREATE INDEX idx_votes_org ON votes(organization_id);
CREATE INDEX idx_comments_org ON comments(organization_id);
CREATE INDEX idx_profiles_org ON profiles(organization_id);

-- RLS Policies
ALTER TABLE vontests ENABLE ROW LEVEL SECURITY;

-- Users can only see vontests from their org
CREATE POLICY "Users view own org vontests"
  ON vontests FOR SELECT
  USING (
    organization_id = (
      SELECT organization_id
      FROM profiles
      WHERE id = auth.uid()
    )
  );

-- Similar for all tables...
```

**API Key Authentication:**

```typescript
// Middleware to validate API key and set context
export async function validateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const apiSecret = req.headers['x-api-secret'];

  if (!apiKey || !apiSecret) {
    return res.status(401).json({ error: 'Missing API credentials' });
  }

  // Look up organization
  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('api_key', apiKey)
    .eq('active', true)
    .single();

  if (!org) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  // Verify secret (compare hash)
  const secretValid = await bcrypt.compare(apiSecret, org.api_secret);
  if (!secretValid) {
    return res.status(401).json({ error: 'Invalid API secret' });
  }

  // Set organization context for this request
  req.organization = org;
  next();
}

// All queries automatically filtered by RLS
app.get('/api/vontests', validateApiKey, async (req, res) => {
  // RLS automatically filters by organization_id
  const { data } = await supabase
    .from('vontests')
    .select('*');

  res.json(data);
});
```

#### Pros ✅
- **Low cost** - Single database for all tenants
- **Easy to manage** - One schema, one set of migrations
- **Fast tenant provisioning** - Just insert row in organizations table
- **Cross-tenant analytics** - Easy to query across all tenants
- **Efficient resource usage** - Shared connection pool
- **Simple deployment** - Single application instance
- **Easier development** - One database to test against

#### Cons ❌
- **RLS complexity** - Must be perfect or risk data leakage
- **Performance concerns** - Large tenants can affect small ones
- **Single point of failure** - Database down = all tenants down
- **Noisy neighbor problem** - One tenant's queries can slow others
- **Limited customization** - All tenants share same schema
- **Scaling limits** - Eventually hit database size limits
- **Security risk** - Bug in RLS = data breach across tenants

#### Cost Analysis (Supabase)
```
Single Database (Supabase Pro):
- $25/month base
- Up to ~500 GB with overages

100 Tenants = $25/month + overages
500 Tenants = $25/month + overages
1000 Tenants = ~$200/month (estimated with overages)

Roughly 10-50x cheaper than database-per-tenant
```

#### Performance Considerations

**Query Performance with organization_id:**

```sql
-- WITHOUT discriminator (current)
SELECT * FROM vontests;
-- Scans all rows

-- WITH discriminator + index
SELECT * FROM vontests WHERE organization_id = 'abc-123';
-- Uses index, only scans relevant rows
-- Performance impact: MINIMAL if indexed properly
```

**Your Question About Computational Expense:**
> "My guess would be that storing it all together with some sort of discriminator like an environment property, would be more computationally expensive and run up server costs."

**Answer**: Actually, the OPPOSITE is usually true:
- ✅ **With proper indexes**, filtering by `organization_id` is extremely fast (O(log n))
- ✅ **Shared connection pool** is more efficient than many separate connections
- ✅ **PostgreSQL is designed for this** - can handle millions of rows efficiently
- ❌ **Only becomes expensive** if you DON'T add indexes (then it's a full table scan)

**Benchmark Example:**
```
Table: 1,000,000 vontests
- 100 organizations
- 10,000 vontests per org

Query: SELECT * FROM vontests WHERE organization_id = 'abc-123'

Without index: ~500ms (full scan)
With index: ~2ms (index lookup)

Cost: Same in both cases
Performance: 250x faster with index
```

---

### Option 3: Schema-per-Tenant (Bridge Model)

One database, but each tenant gets their own PostgreSQL schema.

#### Architecture
```
Single Supabase Project
└── Database
    ├── Schema: org_a (Organization A's tables)
    ├── Schema: org_b (Organization B's tables)
    └── Schema: org_c (Organization C's tables)

Each schema has:
- vontests
- proposals
- votes
- comments
- profiles
```

#### Implementation

```sql
-- Create schema for each tenant
CREATE SCHEMA org_a;
CREATE SCHEMA org_b;

-- Each schema has its own tables
CREATE TABLE org_a.vontests (...);
CREATE TABLE org_a.proposals (...);

CREATE TABLE org_b.vontests (...);
CREATE TABLE org_b.proposals (...);

-- Route queries to correct schema
SET search_path TO org_a;
SELECT * FROM vontests; -- Queries org_a.vontests
```

```typescript
// Application code
const getTenantSchema = (apiKey: string) => {
  const tenant = lookupTenant(apiKey);
  return tenant.schema_name; // e.g., 'org_a'
};

// Set schema for session
await supabase.rpc('set_schema', { schema: getTenantSchema(apiKey) });

// All subsequent queries use that schema
const { data } = await supabase.from('vontests').select('*');
```

#### Pros ✅
- **Better isolation than discriminator** - Separate namespaces
- **Simpler than RLS** - No need for complex policies
- **Medium cost** - Single database
- **Backup flexibility** - Can backup specific schemas
- **Some customization** - Can modify schema per tenant

#### Cons ❌
- **Not well supported in Supabase** - Supabase assumes public schema
- **Migration complexity** - Must migrate each schema separately
- **Limited by database** - Still single database limit
- **Connection management** - Need to set schema per connection
- **Supabase APIs don't support** - Would need custom API layer

#### Cost Analysis
Same as Option 2 (shared database)

#### When to Use
- ⚠️ **Not recommended for Supabase** - Better suited for raw PostgreSQL
- ✅ Good for **self-hosted PostgreSQL**
- ❌ Adds complexity without major benefits over discriminator

---

### Option 4: Hybrid Approach (Recommended for Scale)

Combine multiple strategies based on tenant tier/size.

#### Architecture
```
Small Tenants (< 100 users):
  → Shared Database with discriminator (Pool)

Medium Tenants (100-1000 users):
  → Shared Database, dedicated schemas

Large Tenants (> 1000 users):
  → Dedicated Database (Silo)

Enterprise Customers:
  → Dedicated Database + dedicated infrastructure
```

#### Implementation

```typescript
// Tenant configuration
interface TenantConfig {
  id: string;
  name: string;
  tier: 'free' | 'starter' | 'pro' | 'enterprise';
  isolationModel: 'pool' | 'schema' | 'silo';
  supabaseUrl?: string; // Only for silo
  supabaseKey?: string; // Only for silo
}

// Router
const getDatabaseClient = (tenant: TenantConfig) => {
  switch (tenant.isolationModel) {
    case 'silo':
      // Dedicated database
      return createClient(tenant.supabaseUrl!, tenant.supabaseKey!);

    case 'pool':
      // Shared database with RLS
      return createClient(SHARED_SUPABASE_URL, SHARED_SUPABASE_KEY);

    case 'schema':
      // Schema-based isolation (custom)
      const client = createClient(SHARED_SUPABASE_URL, SHARED_SUPABASE_KEY);
      await client.rpc('set_schema', { schema: tenant.schemaName });
      return client;
  }
};
```

#### Pros ✅
- **Cost optimization** - Efficient for small tenants
- **Performance isolation** - Large tenants don't affect small ones
- **Flexible pricing** - Can charge more for dedicated resources
- **Easy migration path** - Move tenants between tiers
- **Best of both worlds** - Balance cost and isolation

#### Cons ❌
- **Complex to implement** - Multiple code paths
- **Operational overhead** - Managing different models
- **Testing complexity** - Need to test all scenarios

---

## Recommended Architecture

### Phase 1: MVP (Launch)

**Use: Shared Database with RLS (Option 2)**

```
Why:
- Fastest to implement
- Lowest cost to start
- Easy to test and validate
- Can handle 100-500 tenants easily
- Supabase built-in RLS support
```

**Changes Required:**

1. **Database Schema**
```sql
-- New table
CREATE TABLE organizations (...);

-- Add to existing tables
ALTER TABLE vontests ADD organization_id UUID;
ALTER TABLE proposals ADD organization_id UUID;
ALTER TABLE votes ADD organization_id UUID;
ALTER TABLE comments ADD organization_id UUID;
ALTER TABLE threads ADD organization_id UUID;
ALTER TABLE profiles ADD organization_id UUID;

-- Indexes
CREATE INDEX idx_vontests_org ON vontests(organization_id);
CREATE INDEX idx_proposals_org ON proposals(organization_id);
-- ... etc

-- RLS Policies
-- (See detailed example above)
```

2. **Authentication Layer**
```typescript
// New API route: /api/organizations/register
// Creates new organization, generates API keys

// New middleware: validateApiKey
// Validates API key/secret, sets organization context

// Update all routes to use middleware
```

3. **API Keys System**
```typescript
interface Organization {
  id: string;
  name: string;
  api_key: string;        // Public: "vont_live_abc123..."
  api_secret_hash: string; // Private (hashed)
  plan: 'free' | 'pro' | 'enterprise';
  limits: {
    max_users: number;
    max_vontests: number;
    max_proposals_per_vontest: number;
  };
}
```

4. **Rate Limiting per Organization**
```typescript
// Track usage per organization
await redis.incr(`org:${org.id}:requests:${hour}`);

// Enforce limits
if (requestCount > org.limits.max_requests) {
  return res.status(429).json({ error: 'Rate limit exceeded' });
}
```

### Phase 2: Growth (After 100+ customers)

**Add: Hybrid Model**

```
Migrate large customers to dedicated databases
Keep small customers in shared database
```

**When to move customer to dedicated DB:**
- > 1000 users
- > $500/month revenue
- Enterprise contract
- Compliance requirements

### Phase 3: Scale (1000+ customers)

**Add: Multi-Region**

```
US Customers → us-east-1 shared database
EU Customers → eu-west-1 shared database
APAC Customers → ap-southeast-1 shared database
```

---

## Implementation Guide

### Step 1: Create Organizations System (Week 1)

**New File: `supabase/migrations/031_multi_tenant_organizations.sql`**

```sql
-- Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- URL-friendly name
  api_key TEXT UNIQUE NOT NULL DEFAULT ('vont_' || gen_random_uuid()::text),
  api_secret_hash TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  settings JSONB DEFAULT '{
    "branding": {
      "logo_url": null,
      "primary_color": "#6366f1"
    },
    "limits": {
      "max_users": 50,
      "max_vontests": 100,
      "max_proposals_per_vontest": 50
    },
    "features": {
      "custom_domain": false,
      "white_label": false,
      "sso": false,
      "api_access": true
    }
  }',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  active BOOLEAN DEFAULT true
);

-- API key rotation history
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ
);

-- Usage tracking
CREATE TABLE organization_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  metrics JSONB NOT NULL, -- {users: 50, vontests: 20, proposals: 100, api_calls: 5000}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_org_usage_org_period ON organization_usage(organization_id, period_start);

-- Add organization_id to existing tables
ALTER TABLE vontests ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE proposals ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE votes ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE comments ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE threads ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE profiles ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- Create indexes for performance
CREATE INDEX idx_vontests_org ON vontests(organization_id);
CREATE INDEX idx_vontests_org_created ON vontests(organization_id, created_at DESC);
CREATE INDEX idx_proposals_org ON proposals(organization_id);
CREATE INDEX idx_votes_org ON votes(organization_id);
CREATE INDEX idx_comments_org ON comments(organization_id);
CREATE INDEX idx_threads_org ON threads(organization_id);
CREATE INDEX idx_profiles_org ON profiles(organization_id);

-- Enable RLS
ALTER TABLE vontests ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vontests
CREATE POLICY "Users view own org vontests"
  ON vontests FOR SELECT
  USING (
    organization_id = (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users create vontests in own org"
  ON vontests FOR INSERT
  WITH CHECK (
    organization_id = (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Similar policies for all tables...
-- (Repeat for proposals, votes, comments, threads)

-- Function to validate organization is active
CREATE OR REPLACE FUNCTION validate_organization()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM organizations
    WHERE id = NEW.organization_id AND active = true
  ) THEN
    RAISE EXCEPTION 'Organization is not active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate on insert
CREATE TRIGGER validate_vontest_org
  BEFORE INSERT ON vontests
  FOR EACH ROW
  EXECUTE FUNCTION validate_organization();
```

### Step 2: API Key Management (Week 1-2)

**New File: `server/api/organizations/register.post.ts`**

```typescript
import { hash } from 'bcrypt';
import { randomBytes } from 'crypto';

export default defineEventHandler(async (event) => {
  const { name, email, password } = await readBody(event);

  // Generate API credentials
  const apiKey = `vont_live_${randomBytes(32).toString('hex')}`;
  const apiSecret = randomBytes(32).toString('hex');
  const apiSecretHash = await hash(apiSecret, 10);

  // Create organization
  const { data: org, error } = await supabase
    .from('organizations')
    .insert({
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      api_secret_hash: apiSecretHash,
    })
    .select()
    .single();

  if (error) throw error;

  // Return credentials (only shown once!)
  return {
    organization_id: org.id,
    api_key: org.api_key,
    api_secret: apiSecret, // ⚠️ ONLY return this once
    message: 'Save these credentials securely. The secret will not be shown again.'
  };
});
```

**New File: `server/middleware/validateApiKey.ts`**

```typescript
import { compare } from 'bcrypt';

export default defineEventHandler(async (event) => {
  // Only apply to /api routes
  if (!event.path.startsWith('/api/')) return;

  const apiKey = getHeader(event, 'x-api-key');
  const apiSecret = getHeader(event, 'x-api-secret');

  if (!apiKey || !apiSecret) {
    throw createError({
      statusCode: 401,
      message: 'Missing API credentials'
    });
  }

  // Look up organization
  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('api_key', apiKey)
    .eq('active', true)
    .single();

  if (!org) {
    throw createError({
      statusCode: 401,
      message: 'Invalid API key'
    });
  }

  // Verify secret
  const valid = await compare(apiSecret, org.api_secret_hash);
  if (!valid) {
    throw createError({
      statusCode: 401,
      message: 'Invalid API secret'
    });
  }

  // Store organization in event context
  event.context.organization = org;

  // Update last used
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('organization_id', org.id);
});
```

### Step 3: Update Existing APIs (Week 2)

**Example: Update vontests API**

```typescript
// Before (single tenant)
export default defineEventHandler(async (event) => {
  const { data } = await supabase
    .from('vontests')
    .select('*');

  return data;
});

// After (multi-tenant)
export default defineEventHandler(async (event) => {
  const org = event.context.organization;

  // RLS automatically filters, but explicit is safer
  const { data } = await supabase
    .from('vontests')
    .select('*')
    .eq('organization_id', org.id);

  return data;
});
```

### Step 4: Rate Limiting & Usage Tracking (Week 3)

**New File: `server/middleware/rateLimit.ts`**

```typescript
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export default defineEventHandler(async (event) => {
  const org = event.context.organization;
  if (!org) return; // No org = no rate limiting

  const hour = Math.floor(Date.now() / 3600000);
  const key = `ratelimit:${org.id}:${hour}`;

  const requests = await redis.incr(key);
  await redis.expire(key, 7200); // 2 hours

  // Check limits based on plan
  const limits = {
    free: 1000,
    starter: 10000,
    pro: 100000,
    enterprise: 1000000
  };

  if (requests > limits[org.plan]) {
    throw createError({
      statusCode: 429,
      message: 'Rate limit exceeded for your plan'
    });
  }

  // Add rate limit headers
  setHeader(event, 'X-RateLimit-Limit', limits[org.plan]);
  setHeader(event, 'X-RateLimit-Remaining', limits[org.plan] - requests);
});
```

---

## Cost Comparison

### Scenario: 100 Organizations

| Approach | Database Cost | Infrastructure | Total/Month | Cost per Org |
|----------|--------------|----------------|-------------|--------------|
| Database per Tenant | $2,500 | $100 | $2,600 | $26.00 |
| Shared Database | $25 | $100 | $125 | $1.25 |
| Hybrid (90 shared, 10 dedicated) | $275 | $150 | $425 | $4.25 |

### Scenario: 1,000 Organizations

| Approach | Database Cost | Infrastructure | Total/Month | Cost per Org |
|----------|--------------|----------------|-------------|--------------|
| Database per Tenant | $25,000 | $500 | $25,500 | $25.50 |
| Shared Database | $200 | $500 | $700 | $0.70 |
| Hybrid (950 shared, 50 dedicated) | $1,450 | $800 | $2,250 | $2.25 |

**Recommendation**: Start with shared database, migrate to hybrid as you scale.

---

## Security Considerations

### RLS Policy Testing

**Critical**: Must thoroughly test RLS policies to prevent data leakage.

```sql
-- Test script
BEGIN;

-- Set user context for Org A
SET LOCAL jwt.claims.sub TO 'user-a-id';

-- Should only see Org A data
SELECT COUNT(*) FROM vontests; -- Should = Org A count

-- Try to access Org B data
SELECT * FROM vontests WHERE organization_id = 'org-b-id'; -- Should be empty

ROLLBACK;
```

### API Key Security

```typescript
// DO:
✅ Hash API secrets before storing
✅ Use HTTPS only
✅ Rotate keys regularly
✅ Log all API access
✅ Implement rate limiting
✅ Validate on every request

// DON'T:
❌ Store secrets in plain text
❌ Allow HTTP requests
❌ Return secrets after initial creation
❌ Skip validation
❌ Expose internal IDs in APIs
```

---

## Migration Strategy

### Existing Users

If you already have users in the current single-tenant system:

**Option A: Create default organization**
```sql
-- Create a "default" organization for existing users
INSERT INTO organizations (id, name, plan)
VALUES ('default-org-id', 'Default Organization', 'legacy');

-- Assign all existing data to it
UPDATE vontests SET organization_id = 'default-org-id' WHERE organization_id IS NULL;
UPDATE proposals SET organization_id = 'default-org-id' WHERE organization_id IS NULL;
-- etc...
```

**Option B: Each user becomes an organization**
```sql
-- Create organization for each existing user
INSERT INTO organizations (id, name, api_key)
SELECT
  gen_random_uuid(),
  username,
  'vont_' || gen_random_uuid()::text
FROM profiles;

-- Link user's data to their org
UPDATE vontests v
SET organization_id = (
  SELECT o.id FROM organizations o
  JOIN profiles p ON p.username = o.name
  WHERE p.id = v.created_by
);
```

---

## Pricing Strategy

### Suggested Tiers

```
Free Tier:
- 25 users
- 10 active vontests
- 100 proposals/month
- Community support
- $0/month

Starter:
- 100 users
- 50 active vontests
- 1,000 proposals/month
- Email support
- $29/month

Pro:
- 500 users
- Unlimited vontests
- 10,000 proposals/month
- Priority support
- Custom branding
- $99/month

Enterprise:
- Unlimited users
- Unlimited everything
- Dedicated database
- SSO/SAML
- SLA
- Custom pricing (starts at $500/month)
```

---

## Rollout Plan

### Phase 1: Internal Testing (2 weeks)
- Implement shared database approach
- Create test organizations
- Migrate existing data to default org
- Test RLS policies thoroughly

### Phase 2: Private Beta (4 weeks)
- Invite 5-10 pilot customers
- Monitor performance and costs
- Gather feedback
- Iterate on limits and pricing

### Phase 3: Public Launch (Ongoing)
- Open registration
- Market to potential customers
- Scale infrastructure as needed
- Consider hybrid model for large customers

---

## Monitoring & Observability

### Key Metrics to Track

```typescript
// Per organization
- Active users
- API requests/hour
- Database queries/second
- Storage used
- Bandwidth used
- Error rate
- Response time p50/p95/p99

// Platform-wide
- Total organizations
- Revenue (MRR, ARR)
- Churn rate
- Database size
- Query performance
```

### Alerts

```
⚠️ Alert if:
- Organization exceeds 80% of limits
- Error rate > 1% for any org
- Query time > 1s for any org
- Database size > 80% of plan
- Any RLS policy violation attempt
```

---

## Conclusion

**Recommended Approach**: Start with **Shared Database + RLS (Option 2)**

### Why?
1. **Lowest cost to start** (~$125/month for 100 orgs vs $2,500)
2. **Fastest to implement** (2-3 weeks)
3. **Supabase native support** (RLS built-in)
4. **Easy to test** (single database)
5. **Scales to hundreds of customers** before needing changes
6. **Can migrate later** to hybrid or dedicated models

### Next Steps
1. Review this architecture with team
2. Decide on pricing tiers
3. Implement organizations table and RLS
4. Build API key management
5. Test thoroughly (especially RLS!)
6. Launch with pilot customers

---

**Last Updated**: December 2024
**Status**: Planning Phase
**Recommendation**: Shared Database with RLS → Hybrid at scale
