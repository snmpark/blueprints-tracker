# Arc Raiders Blueprint Tracker

A mobile-first web app where you and your friends can track which Arc Raiders blueprints you've collected. Built with vanilla JavaScript, Supabase for persistence, and GitHub Pages for hosting.

## Features

✅ **Mobile-First Design** - Optimized for phones, tablets, and desktops  
✅ **Four User Tracking** - Track blueprints for Aleks, Rudi, publicsweatyvoid, and Chrischtn  
✅ **Rarity Categorization** - Blueprints grouped by Common, Uncommon, Rare, Epic, Legendary  
✅ **User-Color Indicators** - Each user gets their own color for visual feedback  
✅ **Multiple View Modes** - Overview, List, and Missing blueprint views  
✅ **Lock/Unlock Feature** - Prevent accidental blueprint ownership changes  
✅ **Persistent Storage** - Data synced to Supabase for cross-device updates  
✅ **Real Wiki Data** - 77 blueprints scraped from Arc Raiders wiki  
✅ **Optimized Performance** - Fast rendering with minimal network calls  
✅ **Changelog** - View app updates and improvements  

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
3. Create the required tables:

**users table:**
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO users (id) VALUES ('aleks'), ('rudi'), ('publicsweatyvoid'), ('chrischtn');
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
5. Create `config.js` in the root directory:

```javascript
const SUPABASE_CONFIG = {
  url: 'https://your-project.supabase.co',
  key: 'your-anon-key'
};
```

### 3. Deploy to GitHub Pages

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
├── index.html              # Main HTML page
├── styles.css              # Mobile-first CSS
├── script.js               # Frontend logic
├── config.js               # Supabase configuration (create this file)
├── blueprints.json         # Blueprint data (77 blueprints)
├── images/
│   ├── blueprint-background.png
│   └── blueprints/         # 77 blueprint PNG icons
├── README.md               # This file
├── QUICKSTART.md           # Quick start guide
├── IMPLEMENTATION.md       # Technical details
└── package.json
```

## How to Use

1. **Select Your User** - Click one of the four user buttons (Aleks, Rudi, publicsweatyvoid, Chrischtn)
2. **Choose View Mode**:
   - **Overview**: See a 10-column grid overview of all blueprints with ownership indicators
   - **List**: Browse blueprints organized by rarity tier with checkboxes
   - **Missing**: Find blueprints that specific users haven't collected yet
3. **Lock/Unlock Management** - Click the 🔒 button to prevent accidental blueprint ownership changes
4. **Toggle Blueprints** - Click any blueprint to check/uncheck ownership (when unlocked)
5. **Visual Feedback**:
   - Your color border appears when you own a blueprint
   - Checkbox overlay shows checkmark when owned
   - Icons grouped by rarity tier in list and missing views
6. **Hover Tooltips** - Hover over blueprints to see full names on desktop

## User Colors

- 🔴 **Aleks**: Red (#FF6B6B)
- 🔵 **Rudi**: Teal (#4ECDC4)
- 🟡 **publicsweatyvoid**: Yellow (#FFE66D)
- 🟢 **Chrischtn**: Mint Green (#95E1D3)

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
npx http-server . -p 8080 -o

# Or use any local server
python -m http.server 8000
```

### Code Quality

The application includes:
- Optimized event handling (delegated listeners)
- Efficient filtering and sorting algorithms
- Minimal network calls via Supabase
- Memory leak prevention
- Full mobile-first CSS with accessibility features

## Recent Improvements

- ✅ Fixed 8 critical/high-priority issues
- ✅ Optimized performance (95% reduction in event handlers)
- ✅ Improved memory efficiency with single-pass filtering
- ✅ Enhanced lock/unlock feature for safety
- ✅ Added changelog modal for version tracking
- ✅ Added fourth user (Chrischtn) support

## Troubleshooting

**Blueprints not loading?**
- Check browser console for errors (F12)
- Verify `blueprints.json` exists in root
- Check that `images/blueprints/` folder has 77 PNG files

**Supabase not saving?**
- Verify `config.js` exists in root with correct credentials
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

