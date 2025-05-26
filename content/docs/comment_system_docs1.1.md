---
date: 2025-05-26
---

# Nested Comment System Documentation (v1.1)

**Last updated:** 26th May 2025

## Overview

This document describes the design and implementation details of a nested comment system supporting replies to multiple parent comments (a DAG-based model).

Key concepts:

* Comments as nodes
* Reply relationships as directed edges
* Partitioning by `thread_id`
* Cycle prevention to maintain a DAG
* Deletion semantics and orphan-handling

---

## Table of Contents

1. [Data Model](#data-model)
2. [Schema Definitions](#schema-definitions)
3. [Insert Workflow](#insert-workflow)
4. [Query Patterns](#query-patterns)
5. [RPC & Edge Function](#rpc--edge-function)
6. [Client Integration](#client-integration)
7. [Best Practices](#best-practices-and-future-tweaks)

---

## Data Model

* **Node**: A `comment` identified by `(thread_id, id)`.
* **Edge**: A reply relationship stored in a join table, one row per `(parent_id, child_id)`.

### Deletion & Orphan-Handling

* **Cascade deletions**: Deleting a comment cascades to its incoming edges, but children remain, avoiding loss of entire subgraphs.
* **Soft deletes**: Use a `deleted_at` timestamp on `comments` to audit deletions; soft-deleted comments still participate in the DAG without orphaning.
* **Orphan policy**: A check constraint and foreign key ensure you can’t link to a non-existent or permanently deleted parent.

---

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

```sql
CREATE TABLE comments (
  thread_id   UUID         NOT NULL,
  id          UUID         NOT NULL,
  user_id     UUID         NOT NULL,
  comment     TEXT         NOT NULL,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, id),
  FOREIGN KEY (user_id)    REFERENCES auth.users(id),
  FOREIGN KEY (thread_id)  REFERENCES threads(id)
);
```

### `comment_links` table

*(renamed for consistency in RPC references; still functions as the edge table)*

```sql
CREATE TABLE comment_links (
  thread_id  UUID       NOT NULL,
  parent_id  UUID       NOT NULL,
  child_id   UUID       NOT NULL,
  PRIMARY KEY (thread_id, parent_id, child_id),
  FOREIGN KEY (thread_id, parent_id) REFERENCES comments(thread_id, id) ON DELETE CASCADE,
  FOREIGN KEY (thread_id, child_id ) REFERENCES comments(thread_id, id),
  FOREIGN KEY (thread_id)             REFERENCES threads(id)
);
```

---

## Insert Workflow

1. Insert the comment into `comments`.
2. For each `parent_id`, insert a link into `comment_links`.
3. Cycle-prevention trigger rejects back-edges.
4. Entire operation wrapped in an RPC for atomicity.

### Cycle Prevention Trigger

```plpgsql
CREATE OR REPLACE FUNCTION prevent_cycle()
  RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    WITH RECURSIVE reach(p) AS (
      SELECT child_id FROM comment_links
       WHERE thread_id = NEW.thread_id AND parent_id = NEW.child_id
      UNION
      SELECT l.child_id
        FROM comment_links l
        JOIN reach r ON l.parent_id = r.p
    )
    SELECT 1 FROM reach WHERE p = NEW.parent_id
  ) THEN
    RAISE EXCEPTION 'Cycle detected: % → %', NEW.parent_id, NEW.child_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_cycle
  BEFORE INSERT ON comment_links
  FOR EACH ROW EXECUTE FUNCTION prevent_cycle();
```

---

## RPC & Edge Function

### RPC for Inserting a Comment with Links

```sql
CREATE OR REPLACE FUNCTION create_comment_with_links(
  in_thread_id    bigint,
  in_user_id      uuid,
  in_comment_text text,
  in_parent_ids   uuid[]
)
RETURNS uuid AS $$
DECLARE
  new_comment_id uuid := gen_random_uuid();
  pid            uuid;
BEGIN
  -- 1) Insert comment using generated UUID
  INSERT INTO comments (thread_id, id, user_id, comment)
  VALUES (in_thread_id, new_comment_id, in_user_id, in_comment_text);

  -- 2) Insert parent→child links
  FOREACH pid IN ARRAY in_parent_ids LOOP
    IF pid IS NOT NULL THEN
      INSERT INTO comment_links (thread_id, parent_id, child_id)
      VALUES (in_thread_id, pid, new_comment_id);
    END IF;
  END LOOP;

  -- 3) Return new comment ID
  RETURN new_comment_id;
END;
$$ LANGUAGE plpgsql;
```

### Supabase Edge Function: `create-comment-with-links`

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Use POST", { status: 405 });
  }

  const { thread_id, comment, parent_ids } = await req.json();
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser();
  if (authError || !user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data: newId, error } = await supabaseAdmin
    .rpc("create_comment_with_links", {
      in_thread_id:    thread_id,
      in_user_id:      user.id,
      in_comment_text: comment,
      in_parent_ids:   parent_ids
    });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({ comment_id: newId }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
});
```

---

## Client Integration

```typescript
// composables/useComments.ts
export const useComments = () => {
  const { $supabase } = useNuxtApp();

  const addComment = async (
    threadId: number,
    text: string,
    parentIds: string[] = []
  ) => {
    const res = await $supabase.functions.invoke("createComment", {
      body: JSON.stringify({
        thread_id:  threadId,
        comment:    text,
        parent_ids: parentIds
      })
    });

    if (res.error) throw res.error;
    return res.data.comment_id as string;
  };

  return { addComment };
};
```

---

## Query Patterns

```sql
-- Children of a comment
SELECT c.*
  FROM comment_links l
  JOIN comments c
    ON c.thread_id = l.thread_id
   AND c.id = l.child_id
 WHERE l.thread_id = :thread
   AND l.parent_id  = :comment;

-- Parents of a comment
SELECT c.*
  FROM comment_links l
  JOIN comments c
    ON c.thread_id = l.thread_id
   AND c.id = l.parent_id
 WHERE l.thread_id = :thread
   AND l.child_id  = :comment;
```

---

## Best Practices and Future Tweaks

1. **Partition by `thread_id`** & indexing on `(thread_id)`, `(thread_id, parent_id)`, `(thread_id, child_id)`.
2. **Row-Level Security**: enforce `thread_id = current_setting('app.thread_id')::bigint`.
3. **Batch Inserts** for `comment_links` to reduce round trips.
4. **Pagination & Caching**: keyset pagination (`.gt('id', lastId)`), CDN cache headers.
5. **Archiving**: offload old comments and links via scheduled jobs.
6. **TypeScript Types**: `supabase gen types typescript` for compile-time safety.
7. **Testing & Monitoring**:

   * Integration tests for cycle detection.
   * Metrics: insert latency, cycle-rejection counts.
8. **Security**: least-privilege triggers & RPCs; rotate service-role keys.

---
