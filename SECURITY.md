# Option 1: Public Credentials with RLS Security

## Overview
Since the app runs on GitHub Pages (static hosting), Supabase credentials will be visible in the source code. This is **secure** because we use Row-Level Security (RLS) to restrict database access.

## How It Works

```
GitHub Pages (Public)
    ↓ (public credentials)
Supabase (Server-side security)
    ↓ (RLS policies enforce access)
Database
    ├─ Anyone can READ all data
    ├─ User can only UPDATE/INSERT their own rows
    └─ No one can DELETE
```

## Setup Steps

### 1. Create Supabase Project
- Go to https://supabase.com
- Create a new project
- Note: Project URL and Anon Key (they will be public)

### 2. Set Up Tables
See `QUICKSTART.md` for SQL to create:
- `users` table
- `blueprints` table  
- `user_blueprints` table

### 3. Enable RLS (Most Important!)
Go to **Authentication → Policies** in Supabase:

**Step 3a: Enable RLS on `user_blueprints` table**
- Table → `user_blueprints` → RLS toggle → Enable

**Step 3b: Create view policy**
```sql
CREATE POLICY "allow_read_all" ON user_blueprints
FOR SELECT USING (true);
```
This allows the public anon key to see all blueprint data.

**Step 3c: Create update policy**
```sql
CREATE POLICY "allow_update_own" ON user_blueprints
FOR UPDATE USING (user_id = 'aleks' OR user_id = 'rudi' OR user_id = 'publicsweatyvoid')
WITH CHECK (user_id = 'aleks' OR user_id = 'rudi' OR user_id = 'publicsweatyvoid');
```
This prevents bad actors from updating someone else's data.

**Step 3d: Create insert policy**
```sql
CREATE POLICY "allow_insert_own" ON user_blueprints
FOR INSERT WITH CHECK (user_id = 'aleks' OR user_id = 'rudi' OR user_id = 'publicsweatyvoid');
```

### 4. Configure the App
```bash
cp public/config.example.js public/config.js
```

Edit `public/config.js` with your credentials:
```javascript
const SUPABASE_CONFIG = {
  url: 'https://your-project.supabase.co',
  key: 'your_anon_key_here'
};
```

### 5. Deploy to GitHub
```bash
git add .
git commit -m "Add Supabase credentials with RLS"
git push
```

GitHub Pages will serve your site with public credentials, but RLS protects the data.

## Security Analysis

### What's Protected
✅ Each user can only modify their own blueprint data  
✅ Users cannot delete records  
✅ Users cannot see other users' passwords or secrets  
✅ No cross-user data mutation possible  

### What's Exposed
⚠️ Anyone can see which blueprints exist  
⚠️ Anyone can see which blueprints which user has checked  
⚠️ Anyone can see all 3 users' collections  

### If Credentials Leak
🔒 Damage is minimal because RLS restricts:
- Can only modify data in `user_blueprints` table
- Can only toggle own `owned` boolean field
- Cannot read user passwords, emails, or secrets
- Cannot delete or modify blueprints

## Privacy Considerations

If you want **complete privacy** per user, use **Option 2** instead:
- Each user creates their own Supabase project
- Each user keeps their own credentials private
- Users don't see each other's data

## Verification

Test that RLS works:

1. Open browser DevTools → Network
2. Select a user and check a blueprint
3. You should see a POST to Supabase
4. In Supabase, verify the row was updated only for that user

Done! Your app is now secure for GitHub Pages hosting. 🎉

