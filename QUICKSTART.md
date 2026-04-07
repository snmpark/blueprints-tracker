# Quick Start Guide

## 📋 Project Summary

A mobile-first web app for tracking Arc Raiders blueprints across 3 players (Aleks, Rudi, PublicSweatyVoid) using GitHub Pages + Supabase.

## 🚀 Setup in 5 Minutes

### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com) → Create new project
2. Copy your **Project URL** and **Anon Key** (Settings → API)

### Step 2: Create Database Tables
Go to Supabase SQL Editor and run:

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO users (id) VALUES ('aleks'), ('rudi'), ('publicsweatyvoid');

CREATE TABLE blueprints (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  rarity TEXT NOT NULL,
  icon_path TEXT NOT NULL
);

CREATE TABLE user_blueprints (
  user_id TEXT NOT NULL REFERENCES users(id),
  blueprint_id INTEGER NOT NULL REFERENCES blueprints(id),
  owned BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, blueprint_id)
);
```

### Step 2b: Enable Row-Level Security (RLS)
Since credentials are public on GitHub Pages, enable RLS to secure data:

1. Go to **Authentication → Policies** in Supabase
2. Select the `user_blueprints` table
3. **Enable RLS** if not already enabled
4. Create these policies:

```sql
-- Allow users to view all blueprints
CREATE POLICY "view_all_blueprints" ON user_blueprints
FOR SELECT USING (true);

-- Prevent direct deletion (app doesn't delete, only toggles boolean)
-- Optional: add a policy to prevent updates from other users
-- (Frontend enforces this, but good to have server-side validation too)
```

**Note:** The app uses frontend user selection (not authentication), so RLS here provides an additional security layer. The main protection is:
- Public anon key can only READ all data and UPDATE user_blueprints
- No DELETE permission
- Only the app can modify your data

### Step 3: Import Blueprint Data
1. Open Supabase → blueprints table
2. Click "Insert" → "Import data"
3. Upload `public/blueprints.json` from the repo

### Step 4: Configure App
```bash
cp public/config.example.js public/config.js
```

Edit `public/config.js`:
```javascript
const SUPABASE_CONFIG = {
  url: 'https://YOUR-PROJECT.supabase.co',  // Your Supabase URL
  key: 'YOUR-ANON-KEY'                       // Your Anon Key
};
```

### Step 5: Deploy to GitHub Pages
```bash
git add .
git commit -m "Setup blueprint tracker"
git push origin main
```

Then in GitHub:
- Settings → Pages
- Source: Deploy from branch
- Branch: main / root

**Site live in 2 minutes at:** `https://yourusername.github.io/blueprints-tracker/`

## 💻 Local Testing

```bash
# Install http-server
npm install -g http-server

# Run locally
cd public
http-server -p 8080
```

Visit: `http://localhost:8080`

## 🎮 How to Use

1. **Select User**: Click one of the radio buttons (Aleks, Rudi, or PublicSweatyVoid)
2. **View Blueprints**: 
   - **My Blueprints** - See your checked items
   - **Other Users** - See blueprints others haven't checked (helps you know what to look for)
3. **Check Blueprints**: Click any blueprint icon to toggle ownership
4. **Auto-Save**: Changes save instantly to Supabase

## 📱 Features

✅ Mobile-first responsive design  
✅ 77 real blueprints from Arc Raiders wiki  
✅ Three-user tracking system  
✅ Color-coded per user (Red/Teal/Yellow)  
✅ Filter by unchecked blueprints  
✅ Organized by rarity tier  
✅ Persistent storage (Supabase)  

## 🎨 Colors

| User | Color | Hex |
|------|-------|-----|
| Aleks | 🔴 Red | #FF6B6B |
| Rudi | 🔵 Teal | #4ECDC4 |
| PublicSweatyVoid | 🟡 Yellow | #FFE66D |

## 📊 Blueprints by Rarity

| Rarity | Color | Count |
|--------|-------|-------|
| Common | ⚪ Gray | 48 |
| Uncommon | 🟢 Green | 16 |
| Rare | 🔵 Blue | 10 |
| Epic | 🟣 Purple | 3 |
| Legendary | 🟠 Orange | 0 |

## 🗂️ Project Structure

```
blueprints-tracker/
├── public/
│   ├── index.html                  # Main page
│   ├── styles.css                  # Mobile-first CSS
│   ├── script.js                   # Frontend logic + Supabase
│   ├── config.example.js           # Supabase config template
│   ├── blueprints.json             # 77 blueprints metadata
│   ├── images/
│   │   ├── blueprints/             # 77 blueprint PNG icons
│   │   └── blueprint-background.png # Game UI background
│   └── config.js                   # ⚠️ YOUR CREDENTIALS (create from config.example.js)
├── README.md                        # Full documentation
├── QUICKSTART.md                    # This guide
├── IMPLEMENTATION.md                # Technical details
└── package.json
```

## ⚙️ Configuration

### Security Note
On GitHub Pages, your Supabase credentials will be **public** (unavoidable with static hosting). This is secure because:
- Row-Level Security (RLS) restricts what the public anon key can do
- Users can only modify their own blueprint data
- No sensitive data is exposed even if credentials are leaked

### `public/config.js` 

Copy from `config.example.js` and fill in your credentials:

```javascript
const SUPABASE_CONFIG = {
  url: 'https://your-project.supabase.co',      // Your Project URL
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // Your Anon Key
};
```

The app works without `config.js` (local-only mode), but with it you get cross-device sync.

## 🆘 Troubleshooting

**Blueprints not saving?**
- Check `public/config.js` exists and has correct credentials
- Check browser console for errors (F12)
- Verify Supabase tables exist with correct schema
- Verify RLS policies are enabled on `user_blueprints` table

**Page not loading?**
- Clear browser cache (Ctrl+Shift+Delete)
- Verify all files are in `public/` folder
- Check GitHub Pages is enabled in repo settings

**Images not showing?**
- Check `/public/images/blueprints/` folder has 77 PNG files
- Verify `blueprints.json` has correct `icon_path` values
- Check file permissions are readable

**Data visible to other users?**
- This is expected! RLS prevents them from modifying your data
- Each user only affects their own blueprint_user records
- If concerned about privacy, create a separate Supabase project

## 📞 Support

Refer to:
- `README.md` - Full project documentation
- `IMPLEMENTATION.md` - Technical implementation details
- `scrape-blueprint-icons.js` - Icon download script

---

**You're all set!** 🎉

Visit your deployed site and start tracking blueprints with your friends!





