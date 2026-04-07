# Arc Raiders Blueprint Tracker

A mobile-first web app where you and your friends can track which Arc Raiders blueprints you've collected. Built with vanilla JavaScript, Supabase for persistence, and GitHub Pages for hosting.

## Features

✅ **Mobile-First Design** - Optimized for phones, tablets, and desktops  
✅ **Three User Tracking** - Track blueprints for Aleks, Rudi, and PublicSweatyVoid  
✅ **Rarity Categorization** - Blueprints grouped by Common, Uncommon, Rare, Epic, Legendary  
✅ **User-Color Indicators** - Each user gets their own color for visual feedback  
✅ **Filter View** - See which blueprints each user hasn't checked yet  
✅ **Persistent Storage** - Data synced to Supabase for cross-device updates  
✅ **Real Wiki Data** - 77+ blueprints scraped from Arc Raiders wiki  

## Quick Start

### 1. Clone & Setup

```bash
git clone https://github.com/yourusername/blueprints-tracker.git
cd blueprints-tracker
npm install
```

### 2. Set Up Supabase

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Create two tables:

**users table:**
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO users (id) VALUES ('aleks'), ('rudi'), ('publicsweatyvoid');
```

**blueprints table:**
```sql
CREATE TABLE blueprints (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  rarity TEXT NOT NULL,
  icon_path TEXT NOT NULL
);
```

**user_blueprints table:**
```sql
CREATE TABLE user_blueprints (
  user_id TEXT NOT NULL REFERENCES users(id),
  blueprint_id INTEGER NOT NULL REFERENCES blueprints(id),
  owned BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, blueprint_id)
);
```

4. Copy your Supabase URL and Anon Key from Settings → API
5. Create `public/config.js` (copy from `config.example.js`):

```javascript
const SUPABASE_CONFIG = {
  url: 'https://your-project.supabase.co',
  key: 'your-anon-key'
};
```

### 3. Import Blueprint Data

Run the scraper to fetch real data from Arc Raiders wiki:

```bash
node scrape-blueprints-real.js
```

Then manually import the data into Supabase:
- Open Supabase → blueprints table
- Import the data from `public/blueprints.json`

### 4. Deploy to GitHub Pages

1. Update repository URL in `package.json`
2. Push to GitHub:

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

3. Enable GitHub Pages in repo settings:
   - Settings → Pages
   - Source: Deploy from branch
   - Branch: main / root

Your site will be live at `https://yourusername.github.io/blueprints-tracker/`

## Project Structure

```
blueprints-tracker/
├── public/
│   ├── index.html          # Main HTML
│   ├── styles.css          # Mobile-first CSS
│   ├── script.js           # Frontend logic
│   ├── config.example.js   # Supabase config template
│   ├── blueprints.json     # Blueprint data (auto-generated)
│   └── images/
│       └── blueprints/     # Blueprint icons (auto-generated)
├── scrape-blueprints-real.js  # Wiki scraper
└── package.json
```

## How to Use

1. **Select Your User** - Click one of the radio buttons (Aleks, Rudi, PublicSweatyVoid)
2. **View Mode**:
   - **My Blueprints**: See & manage your own checked blueprints
   - **Other Users**: See which blueprints others haven't checked yet
3. **Toggle Blueprints** - Click any blueprint icon to check/uncheck it
4. **Visual Feedback**:
   - Your color border appears when you check a blueprint
   - Checkbox overlay shows checkmark when owned
   - Icons grouped by rarity tier

## User Colors

- 🔴 **Aleks**: Red (#FF6B6B)
- 🔵 **Rudi**: Teal (#4ECDC4)
- 🟡 **PublicSweatyVoid**: Yellow (#FFE66D)

## Rarity Tiers

- ⚪ **Common** - Gray (#A0A0A0)
- 🟢 **Uncommon** - Green (#1EFF00)
- 🔵 **Rare** - Blue (#0070DD)
- 🟣 **Epic** - Purple (#A335EE)
- 🟠 **Legendary** - Orange (#FF8000)

## Development

### Run Locally

```bash
# With Node.js http-server
npx http-server public -p 8080 -o

# Or use any local server
python -m http.server 8000 --directory public
```

### Update Blueprints from Wiki

```bash
node scrape-blueprints-real.js
```

Then re-import `public/blueprints.json` to Supabase.

## Troubleshooting

**Blueprints not loading?**
- Check browser console for errors (F12)
- Verify `public/blueprints.json` exists
- Check that `public/images/blueprints/` has SVG files

**Supabase not saving?**
- Verify `public/config.js` exists with correct credentials
- Check Supabase project is active
- View Supabase logs in Settings → Logs

**GitHub Pages not updating?**
- Wait 1-2 minutes for GitHub to rebuild
- Check "Actions" tab for build status
- Verify pages source is set to "Deploy from branch"

## Browser Support

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile Safari 14+

## License

MIT - Feel free to use for personal projects

## Credits

- Blueprint data from [Arc Raiders Wiki](https://arcraiders.wiki)
- Built with [Supabase](https://supabase.com)
- Hosted on [GitHub Pages](https://pages.github.com)

