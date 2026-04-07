// Supabase Configuration
// ====================================
// IMPORTANT: On GitHub Pages (static hosting), these credentials will be PUBLIC.
// This is secure because we use Row-Level Security (RLS) in Supabase to restrict access.
//
// Setup Instructions:
// 1. Go to https://supabase.com and create a new project
// 2. Set up tables (see QUICKSTART.md)
// 3. ENABLE Row-Level Security (RLS) on user_blueprints table:
//    - Allow users to read all blueprints
//    - Allow users to write/update only their own rows
// 4. Copy your Project URL and Anon Key below
// 5. Replace THIS FILE (config.example.js) with your actual credentials
//
// Security Model:
// - Anon key is intentionally public (unavoidable on static hosting)
// - RLS policies in Supabase enforce data access control
// - Users can only modify their own blueprint data
// - Even if credentials are leaked, damage is minimal due to RLS restrictions
//
// See QUICKSTART.md for RLS setup instructions.

const SUPABASE_CONFIG = {
  // Your Supabase project URL
  // Found in: Settings → API → Project URL
  url: 'https://vbiwvftunvzwcbamszrt.supabase.co',

  // Your Supabase anon key
  // ⚠️ This will be public on GitHub Pages. That's OK with RLS enabled!
  // Found in: Settings → API → Project API keys (copy "anon" key)
  key: 'sb_publishable_5B0MtajUqg_SAHpmq3tHgQ_QFZyDCrT'
};



