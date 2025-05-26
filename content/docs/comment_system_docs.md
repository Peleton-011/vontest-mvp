---
date: 2025-05-26
---
# Nested Comment System Documentation (v1.0)
**Last updated:** 26th May 2025
## Overview
This document describes the design and implementation details of a nested comment system supporting replies to multiple parent comments (a DAG-based model).

Key concepts:

* Comments as nodes
* Reply relationships as directed edges
* Partitioning by `thread_id`
* Cycle prevention to maintain a DAG
---
## Table of Contents
1. [Data Model](#data-model)
2. [Schema Definitions](#schema-definitions)
3. [Insert Workflow](#insert-workflow)
4. [Query Patterns](#query-patterns)
5. [API Payloads](#api-payloads)
6. [Best Practices](#best-practices-and-future-tweaks)
---
## Data Model
* **Node**: A `comment` identified by `thread_id` + `id`.
* **Edge**: A reply relationship stored in a join table, one row per `(parent_id, child_id)`.
### Deletion & Orphan-Handling
* **Cascade deletions**: By default, deleting a comment cascades to its incoming `comment_replies`, but children remain; this avoids accidental loss of entire subgraphs.
* **Soft deletes**: We recommend a `deleted_at` timestamp on `comments` for audit. Soft-deleted nodes can still be parents without orphaning.
* **Orphan policy**: Disallow links where the parent does not exist or is permanently deleted. Enforced via foreign key and a check constraint.
## DAG Model Diagram
```
     [A]
    /   \
  [B]   [C]
    \
     [D]
```
*Comments A, B, C, D in thread 123 form a small DAG: A→B, A→C, B→D.*

---
## Schema Definitions
### `comments` table
Stores all comment payloads. We strongly recommend using a foreign key (`user_id`) to reference the authorship rather than denormalizing the `username`. This ensures consistency if users can change their usernames, and avoids cascading update issues.
```sql
CREATE TABLE comments (
  thread_id   UUID         NOT NULL,
  id  UUID         NOT NULL,
  user_id     UUID         NOT NULL,                -- references users(id)
  comment     TEXT         NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, id),
  FOREIGN KEY (user_id) REFERENCES auth.users(id)
  FOREIGN KEY (thread_id) REFERENCES proposals(id)
);
```
### `comment_links` table
Join table for parent→child edges.
```sql
CREATE TABLE comment_links (
  thread_id  UUID       NOT NULL,
  parent_id  UUID  NOT NULL,
  child_id   UUID  NOT NULL,
  PRIMARY KEY (thread_id, parent_id, child_id),
  FOREIGN KEY (thread_id, parent_id) REFERENCES comments(thread_id, id),
  FOREIGN KEY (thread_id, child_id ) REFERENCES comments(thread_id, id)
  FOREIGN KEY (thread_id) REFERENCES proposals(id)
);
```
---
## Insert Workflow

1. Write the comment into `comments`.
2. For each parent in the `parent_id` list, insert an edge into `comment_links`.
3. Validate no cycles will be formed (see Cycle Prevention).

### Prevent cycles, reachability check on `comment_links`

For cycle‐prevention you want your check to sit squarely on the edge‐table (`comment_link`), since that’s where new parent→child relationships are created. Here’s a pattern that combines a PL/pgSQL trigger (or policy) with RLS and transactions so that:

1. Any attempt to insert a link that would create a cycle is rejected

2. If you’re in the middle of creating a brand-new comment and its links, the whole operation rolls back on failure

This is so any `INSERT` into `comment_links` that would create a back‐edge is blocked by the exception.
```
CREATE OR REPLACE FUNCTION prevent_cycle() 
  RETURNS TRIGGER
  LANGUAGE plpgsql AS
$$
BEGIN
  -- Check if NEW.parent_id is already reachable from NEW.child_id
  IF EXISTS (
    WITH RECURSIVE reach(p) AS (
      SELECT child_id
        FROM comment_links
       WHERE thread_id = NEW.thread_id
         AND parent_id = NEW.child_id
      UNION
      SELECT l.child_id
        FROM comment_links l
        JOIN reach r ON l.parent_id = r.p
    )
    SELECT 1
      FROM reach
     WHERE p = NEW.parent_id
  ) THEN
    RAISE EXCEPTION 'Cycle detected: % → %', NEW.parent_id, NEW.child_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Then attach the trigger
CREATE TRIGGER trg_prevent_cycle
  BEFORE INSERT ON comment_links
  FOR EACH ROW
  EXECUTE FUNCTION prevent_cycle();
```
### RPC for inserting a comment with its links
Because Postgres runs each function in a transaction, this will bundle comment + links in one ACID scope, and still fire the `prevent_cycle()` trigger on each link insert.

This function:

* Inserts the `comment` row.

* Iterates the `parent_ids` array, inserting each edge.

* Will automatically roll back the entire insert if `prevent_cycle()` trigger fires an exception.
```
-- 1) RPC to create comment + its links
CREATE OR REPLACE FUNCTION create_comment_with_links(
  in_thread_id    bigint,
  in_comment_id   uuid,
  in_user_id      uuid,
  in_comment_text text,
  in_parent_ids   uuid[]    -- array of parent comment.ids
)
RETURNS void AS $$
DECLARE
  pid uuid;
BEGIN
  -- insert the comment
  INSERT INTO comments (thread_id, id, user_id, comment)
  VALUES (in_thread_id, in_comment_id, in_user_id, in_comment_text);

  -- loop through each parent_id
  FOREACH pid IN ARRAY in_parent_ids LOOP
    IF pid IS NOT NULL THEN
      INSERT INTO comment_links (thread_id, parent_id, child_id)
      VALUES (in_thread_id, pid, in_comment_id);
      -- if this would create a cycle, your BEFORE INSERT trigger will raise and abort
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```
---
## Query Patterns
### Get all replies (children) of a comment
```sql
SELECT c.*
  FROM comment_links l
  JOIN comments c
    ON c.thread_id = l.thread_id
   AND c.id = l.child_id
 WHERE l.thread_id = :thread
   AND l.parent_id  = :comment;
```
### Get all parents of a comment
```sql
SELECT c.*
  FROM comment_links l
  JOIN comments c
    ON c.thread_id = l.thread_id
   AND c.id = l.parent_id
 WHERE l.thread_id = :thread
   AND l.child_id  = :comment;
```
---
## API Payloads
Example JSON for creating a comment using the rpc:
```json
{
    "in_thread_id":    "xyzabc-987-xyzabc",
    "in_comment_id":   "defabc-123-defabc",
    "in_user_id":      "xyzxyz-123-xyzxyz",
    "in_comment_text": "This is my first comment!",
    "in_parent_ids":   ["abcabc-123-abcabc","bbdef0-456-bbdef0"],
  }
```
Here's a direct call of the RPC:
```typescript
const { error } = await supabase
  .rpc('create_comment_with_links', {
    in_thread_id:    threadId,
    in_comment_id:   commentId,
    in_user_id:      userId,
    in_comment_text: text,
    in_parent_ids:   parentIds,
  });
```
This call to the RPC would in turn make the equivalent of these following inserts:
* Into the `comments` table:
  ```sql
  INSERT INTO comments (thread_id, id, user_id, comment)
  VALUES (in_thread_id, in_comment_id, in_user_id, in_comment_text);
  ```
* Into the `comment_links` table:
  ```sql
  INSERT INTO comment_links (thread_id, parent_id, child_id)
  VALUES (in_thread_id, pid, in_comment_id);
  ```
    *with `pid` being each of the `in_parent_ids`*
---
## Best Practices and future tweaks
1. **Partition queries by `thread_id`** so each thread’s data is isolated and performance scales horizontally:
   * **Row-Level Security (RLS)**: Leverage Supabase’s RLS to enforce that every query filters by `thread_id`. For example, you can create a policy on `comment_links`:
     ```sql
     CREATE POLICY "Thread access" ON comment_links
       FOR SELECT USING (thread_id = current_setting('app.thread_id')::bigint);
     ```
     Set `app.thread_id` as a session variable in your Edge Functions or client middleware before running any queries.
   * **Query Templates**: In application code, always include `.eq('thread_id', threadId)`:
     ```js
     const { data } = await supabase
       .from('comments')
       .select('*')
       .eq('thread_id', threadId);
     ```
   * **Indexing**: Ensure you have b-tree indexes on:
     * `(thread_id)`
     * `(thread_id, parent_id)`
     * `(thread_id, child_id)`
       This dramatically speeds up lookups and joins within a thread.
2. **Batch Inserts for Edges**: When creating multiple parent→child links, bundle them in one insert to reduce round-trips:
   ```js
   const edges = parentIds.map(pid => ({ thread_id: threadId, parent_id: pid, child_id: commentId }));
   await supabase
     .from('comment_links')
     .insert(edges);
   ```
3. **Caching & Pagination**:
   * **Keyset Pagination**: Use `limit()` and `.gt('id', lastSeenId)` for efficient paging.
   * **CDN Caching**: On your REST or GraphQL endpoint, set appropriate cache headers so Supabase’s CDN can serve stale-while-revalidate content for popular threads.
4. **Data Archiving**:
   * Move older comments out of the hot tables periodically (e.g. into `comments_archive`) via a scheduled Supabase Edge Function or external cron job.
   * Archiving both `comments` and `comment_links` in lockstep keeps the DAG intact.
5. **TypeScript Typings**
   * Generate and import DB types for compile-time safety:
     ```bash
     supabase gen types typescript --schema public > src/types/db.ts
     ```
6. **Security Best Practices**
   * Restrict all direct table access; force operations through RLS-protected functions or policies.
   * Rotate service-role keys regularly and scope their permissions minimally.
7. **Normalize User References**: Use a `user_id` foreign key in `comments` (and optionally `comment_links` if you track link creators) rather than storing `username` directly.
   * When retrieving comments, `JOIN users ON comments.user_id = users.id` to fetch the current username and profile data.
   * This avoids repeated updates if a user changes their username, and ensures data consistency.
   * Example query:
     ```js
     const { data } = await supabase
       .from('comments')
       .select('comment, created_at, users(username, avatar_url)')
       .eq('thread_id', threadId);
     ```
8. **Composite Keys & Table Partitioning**: To emulate DynamoDB-style partition/sort keys in Supabase’s Postgres:
   * **Composite Primary Key**
     Define your `comments` (and `comment_links`) tables with a composite primary key of `(thread_id, id)`:
     ```sql
     CREATE TABLE comments (
       thread_id   UUID       NOT NULL,
       id          UUID       NOT NULL,
       user_id     UUID       NOT NULL,
       comment     TEXT       NOT NULL,
       created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
       PRIMARY KEY (thread_id, id),
       FOREIGN KEY (user_id) REFERENCES users(id)
     );
     ```
     This ensures queries filtering by `thread_id` are efficient, with `id` providing natural sort order.
   * **Declarative Partitioning (Optional)**
     For very large tables, use PostgreSQL’s built-in partitioning on `thread_id` (e.g., hash-based):
     ```sql
     CREATE TABLE comments (
       thread_id   BIGINT     NOT NULL,
       id          UUID       NOT NULL,
       -- other columns...
     ) PARTITION BY HASH (thread_id);

     CREATE TABLE comments_p0 PARTITION OF comments
       FOR VALUES WITH (MODULUS 4, REMAINDER 0);
     CREATE TABLE comments_p1 PARTITION OF comments
       FOR VALUES WITH (MODULUS 4, REMAINDER 1);
     -- continue for each partition
     ```
     Supabase will automatically route queries based on `thread_id`.
---
