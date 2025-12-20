# Testing Guide - Groups Module

## 🎯 What Can You Test Now?

The Groups module is ready for end-to-end testing! Here's everything you can do:

---

## ✅ Prerequisites

1. **Database migrations completed** - All 5 migration files run in Supabase
2. **TypeScript types updated** - `types/supabase.ts` regenerated
3. **App running** - `npm run dev` on `http://localhost:3000`
4. **Logged in** - You must be authenticated to access games

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

### Scenario 5: Leave a Group (Non-Admin)

**Note:** This requires another user. For now, you can test by:

**Steps:**
1. Create a second test account
2. As admin, you'd need to invite them (feature coming next)
3. As non-admin member, click **"Leave Group"**
4. Confirm the dialog
5. Should redirect to `/games` list

**Expected Results:**
- ✅ Confirmation dialog appears
- ✅ Successfully leaves group
- ✅ Redirects to groups list
- ✅ Group no longer appears in your list

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

- ⏳ **Invite members** - Button exists but doesn't work yet
- ⏳ **Group settings** - Settings button doesn't work yet
- ⏳ **Edit group** - Can't edit name/description yet
- ⏳ **Delete group** - No delete functionality yet
- ⏳ **Upload avatar** - Avatar URL field exists but no upload UI
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

### Phase 3: Invitations System
- Send invitations by username or email
- Accept/decline invitations
- Pending invitations badge

### Phase 4: Group Management
- Edit group settings
- Delete groups
- Upload group avatars
- Remove members (admin only)
- Promote/demote members

### Phase 5: First Game Type
- "Would You Rather Ranked"
- Daily game generation
- Intensity voting (1-10 scale)
- Distribution analytics

---

## 🎮 Ready to Test!

1. **Start your dev server:** `npm run dev`
2. **Log in** to the app
3. **Click "Games"** in the navbar
4. **Follow the test scenarios above**

Let me know if you encounter any issues! 🚀

---

*Last Updated: 2024-12-19*
*Status: Groups Module - E2E Testing Ready*
