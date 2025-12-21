# Testing Guide - Groups Module

## 🎯 What Can You Test Now?

The Groups module with invite code system is ready for end-to-end testing! Here's everything you can do:

---

## ✅ Prerequisites

1. **Database migrations completed** - All 10 migration files run in Supabase:
   - 001-006: Core functionality (groups, games, invite codes)
   - 007: Fix RLS infinite recursion
   - 008: Fix groups SELECT policy for post-creation access
   - 009: Remove insecure views (security fix)
   - 010: Remove invite codes view (security fix)
2. **TypeScript types updated** - `types/supabase.ts` regenerated
3. **App running** - `npm run dev` on `http://localhost:3000`
4. **Logged in** - You must be authenticated to access games
5. **Environment variable set** - `NUXT_PUBLIC_SITE_URL` configured (optional, defaults to localhost:3000)

---

## 🧪 Test Scenarios

### Scenario 1: Create Your First Group

**Steps:**
1. Log in to the app
2. Click **"Games"** in the navigation bar
3. You should see empty state: "No groups yet"
4. Click **"Create Your First Group"** button
5. Fill out the form:
   - **Group Name:** "Test Group" (3-50 characters)
   - **Description:** "Testing the new games module" (optional)
   - **Select Games:** Check all 4 game types
   - **Daily Game Time:** Keep default "09:00"
   - **Timezone:** Select your timezone
6. Click **"Create Group"**
7. You should see success message
8. Auto-redirect to group page after 1.5 seconds

**Expected Results:**
- ✅ Form validates (name must be 3-50 chars)
- ✅ At least one game must be selected
- ✅ Success message appears
- ✅ Redirects to `/games/{groupId}`
- ✅ You're automatically added as admin

**Database Verification:**
```sql
-- Check group was created
SELECT * FROM groups WHERE name = 'Test Group';

-- Check you were added as admin
SELECT * FROM group_members
WHERE role = 'admin'
ORDER BY joined_at DESC LIMIT 1;
```

---

### Scenario 2: View Groups List

**Steps:**
1. Go to `/games`
2. You should see your created group in the grid

**Expected Results:**
- ✅ Group card shows name
- ✅ Shows member count (should be "1 member" - just you)
- ✅ Shows active games count (0 for now)
- ✅ Shows total games count (0 for now)
- ✅ Clicking card navigates to group page
- ✅ "View" button works

---

### Scenario 3: View Group Details

**Steps:**
1. Click on your group from the list
2. Or navigate to `/games/{your-group-id}`

**Expected Results:**
- ✅ Group header shows name, description, avatar
- ✅ Shows member count
- ✅ Shows "👑 Admin" badge
- ✅ "Games" tab shows "No active game" message
- ✅ "Members" tab shows you in the list
- ✅ Your member card shows:
  - Your username
  - "👑 Admin" role
  - Games played (0)
  - Total score (0 pts)

---

### Scenario 4: Create Multiple Groups

**Steps:**
1. Go back to `/games`
2. Click **"Create Group"** (top right button)
3. Create another group with different settings
4. Repeat to create 3-4 groups

**Expected Results:**
- ✅ Can create multiple groups
- ✅ All groups appear in grid view
- ✅ Each group has correct settings
- ✅ You're admin of all created groups

---

### Scenario 5: Create Invite Code

**Steps:**
1. Go to your group page `/games/{group-id}`
2. Click the **"Invite"** tab
3. You should see empty state: "No active invite links"
4. Click **"Create Invite Link"** button
5. A new invite code should appear in the list
6. The code should show:
   - 8-character random code (e.g., "abc123xy")
   - Creation date
   - Uses count (0 / unlimited)
   - Full invite URL
7. Click **"Copy Link"** button
8. You should see alert: "Invite link copied to clipboard!"

**Expected Results:**
- ✅ Invite code generated successfully
- ✅ Shows in active invites list
- ✅ Full URL displayed (e.g., `http://localhost:3000/games/join/abc123xy`)
- ✅ Copy to clipboard works
- ✅ Uses count shows 0

**Database Verification:**
```sql
-- Check invite code was created
SELECT * FROM group_invite_codes
WHERE group_id = 'your-group-id'
ORDER BY created_at DESC LIMIT 1;

-- Should show: is_active = true, uses_count = 0
```

---

### Scenario 6: Join Group via Invite Link

**Note:** Best tested with a second account or incognito window

**Steps:**
1. Copy an invite link from Scenario 5
2. **Option A:** Open in incognito window and log in with different account
3. **Option B:** Create a second test account
4. Paste the invite link (e.g., `http://localhost:3000/games/join/abc123xy`)
5. You should see group preview page with:
   - "You've been invited!" header
   - Group name and description
   - Member count
   - Expiration date (if set)
   - Uses count (if limited)
6. Click **"Join Group"** button
7. Should auto-redirect to group page after 0.5 seconds
8. You should now be a member of the group

**Expected Results:**
- ✅ Group preview shows correct info
- ✅ Join button works
- ✅ Redirects to `/games/{group-id}`
- ✅ You appear in Members tab as "Member" role
- ✅ Group appears in your `/games` list
- ✅ Uses count incremented in invite code

**Database Verification:**
```sql
-- Check you were added as member
SELECT * FROM group_members
WHERE group_id = 'group-id' AND user_id = 'your-user-id';

-- Check invite code use was tracked
SELECT * FROM invite_code_uses
WHERE code = 'abc123xy'
ORDER BY used_at DESC LIMIT 1;

-- Check uses count incremented
SELECT uses_count FROM group_invite_codes
WHERE code = 'abc123xy';
```

---

### Scenario 7: Deactivate Invite Code

**Steps:**
1. As group admin, go to **"Invite"** tab
2. Find an active invite code
3. Click the **X** (deactivate) button
4. Confirm the dialog: "Are you sure you want to deactivate this invite link?"
5. Code should disappear from active list

**Expected Results:**
- ✅ Confirmation dialog appears
- ✅ Code is deactivated
- ✅ Disappears from active invites
- ✅ Link no longer works (try joining - should show error)

**Database Verification:**
```sql
-- Check code was deactivated
SELECT is_active FROM group_invite_codes
WHERE code = 'abc123xy';
-- Should return: is_active = false
```

---

### Scenario 8: Leave a Group (Non-Admin)

**Note:** This requires being a non-admin member (use account from Scenario 6)

**Steps:**
1. As non-admin member, go to group page
2. Click **"Leave Group"** button (top right)
3. Confirm the dialog
4. Should redirect to `/games` list
5. Group no longer appears in your list

**Expected Results:**
- ✅ Confirmation dialog appears
- ✅ Successfully leaves group
- ✅ Redirects to groups list
- ✅ Group no longer appears in your list
- ✅ Admin can see you're no longer in Members tab

---

## 🔍 What to Check For

### UI/UX Testing

- [ ] **Loading states** - Spinner appears while fetching data
- [ ] **Error states** - Error message shows if something fails
- [ ] **Empty states** - Helpful message when no groups exist
- [ ] **Form validation** - Can't submit invalid forms
- [ ] **Responsive design** - Works on mobile, tablet, desktop
- [ ] **Navigation** - Back buttons work correctly

### Data Integrity

- [ ] **RLS policies work** - Can only see your own groups
- [ ] **Auto-admin trigger** - Creator is added as admin automatically
- [ ] **Settings saved** - Group settings (games, time, timezone) persist
- [ ] **Member stats** - Shows correct games played and score (0 initially)

### Performance

- [ ] **Fast loading** - Groups load quickly (uses RPC function)
- [ ] **No errors in console** - Check browser dev tools
- [ ] **TypeScript types** - No type errors, autocomplete works

---

## 🐛 Known Limitations (Not Yet Implemented)

These features will come in the next development session:

- ✅ **Invite members via codes** - COMPLETED! Shareable invite links work
- ⏳ **Group settings page** - Settings button doesn't work yet
- ⏳ **Edit group** - Can't edit name/description yet
- ⏳ **Delete group** - No delete functionality yet
- ⏳ **Upload avatar** - Avatar URL field exists but no upload UI
- ⏳ **Promote/demote members** - Can't change member roles yet
- ⏳ **Remove members** - Admin can't kick members yet (they must leave)
- ⏳ **Active games** - No games created yet (needs game module)
- ⏳ **Game history** - No past games to show yet

---

## 📊 Database Queries for Verification

### Check Your Groups
```sql
-- View all your groups
SELECT * FROM groups
WHERE created_by = 'your-user-id'
ORDER BY created_at DESC;
```

### Check Group Members
```sql
-- See all members of a specific group
SELECT
  gm.*,
  p.username,
  p.avatar_url
FROM group_members gm
JOIN profiles p ON p.id = gm.user_id
WHERE gm.group_id = 'your-group-id';
```

### Check with Helper Function
```sql
-- Use the RPC function (same as composable uses)
SELECT * FROM get_user_groups('your-user-id');
```

### Check Member Stats
```sql
-- Use the stats function
SELECT * FROM get_group_members_with_stats('your-group-id');
```

---

## 🚨 Troubleshooting

### "Group not found" or Access Denied

**Cause:** RLS policy blocking access

**Fix:**
1. Check you're logged in
2. Verify you're a member: `SELECT * FROM group_members WHERE user_id = auth.uid()`
3. Check RLS policies are enabled: `SELECT * FROM pg_policies WHERE tablename = 'groups'`

### Form Won't Submit

**Cause:** Validation failing

**Check:**
- Name is 3-50 characters
- At least one game is selected
- User is authenticated

### Groups Not Appearing

**Cause:** RPC function not working or RLS policy issue

**Debug:**
```sql
-- Test RPC function directly
SELECT * FROM get_user_groups(auth.uid());

-- Check if groups exist
SELECT * FROM groups WHERE created_by = auth.uid();
```

### TypeScript Errors

**Cause:** Types not regenerated

**Fix:**
```bash
npx supabase gen types typescript --project-id "your-project-id" > types/supabase.ts
```

---

## ✅ Success Criteria

You've successfully completed testing if you can:

1. ✅ Create a group and see success message
2. ✅ View group in the list
3. ✅ Click group to see details page
4. ✅ See yourself as admin in members tab
5. ✅ Create multiple groups
6. ✅ Navigate between pages smoothly
7. ✅ No errors in browser console
8. ✅ Database shows correct data

---

## 📝 Next Steps After Testing

Once testing is complete, we'll build:

### ✅ Phase 2: Invite Code System - COMPLETED!
- ✅ Generate shareable invite codes
- ✅ Join groups via invite links
- ✅ Preview group before joining
- ✅ Track code usage and expiration
- ✅ Deactivate codes (admin only)

### Phase 3: Game Instances Module
- Create `useGameInstances.ts` composable
- Create `useGameResponses.ts` composable
- Create `useGameVotes.ts` composable
- Build first game type: "Would You Rather Ranked"
- Intensity slider component (1-10 scale)
- Distribution chart component
- Game results page

### Phase 4: Daily Automation
- Edge Function for daily game generation
- Cron job scheduling
- Game expiration handling
- Push notifications (optional for MVP)

### Phase 5: Additional Group Management
- Edit group settings page
- Delete groups
- Upload group avatars
- Remove members (admin only)
- Promote/demote members

### Phase 6: Additional Game Types
- Hot Takes (with debate matching)
- Guess Who Said It (multi-phase)
- Most Likely To

---

## 🎮 Ready to Test!

1. **Start your dev server:** `npm run dev`
2. **Log in** to the app
3. **Click "Games"** in the navbar
4. **Follow the test scenarios above**

Let me know if you encounter any issues! 🚀

---

*Last Updated: 2025-12-20*
*Status: Groups Module + Invite Code System - E2E Testing Ready*
