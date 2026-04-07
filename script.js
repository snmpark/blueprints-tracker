// ============================================================================
// Arc Raiders Blueprint Tracker - Frontend JavaScript
// ============================================================================

const USERS = ['aleks', 'rudi', 'publicsweatyvoid'];

// Supabase instance (initialized after library loads)
// Don't declare as 'let supabase' because the library already creates window.supabase

function getSupabase() {
  if (typeof SUPABASE_CONFIG !== 'undefined' && typeof window.supabase !== 'undefined') {
    // Create client if not already created
    if (!window.supabaseClient) {
      try {
        const { createClient } = window.supabase;
        window.supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);
        console.log('✓ Supabase client created');
      } catch (error) {
        console.error('Failed to create Supabase client:', error);
        return null;
      }
    }
    return window.supabaseClient;
  }
  return null;
}

// App state
let appState = {
  blueprints: [],
  currentUser: null,
  userBlueprintsOwned: {}, // { user: { blueprintId: boolean } }
  viewMode: 'my-blueprints', // 'my-blueprints' or 'other-users'
  filterUser: null // For 'other-users' mode
};

// ============================================================================
// DOM Elements
// ============================================================================

let statusText;
let blueprintsContainer;
let loadingSpinner;
let errorDiv;
let userRadios;
let viewToggleButtons;

function initDOMElements() {
  statusText = document.getElementById('status-text');
  blueprintsContainer = document.getElementById('blueprints-container');
  loadingSpinner = document.getElementById('loading');
  errorDiv = document.getElementById('error');
  userRadios = document.querySelectorAll('input[name="user"]');
  viewToggleButtons = document.querySelectorAll('.toggle-btn');

  console.log('✓ DOM elements initialized');
  console.log('  - statusText:', !!statusText);
  console.log('  - blueprintsContainer:', !!blueprintsContainer);
  console.log('  - loadingSpinner:', !!loadingSpinner);
  console.log('  - errorDiv:', !!errorDiv);
  console.log('  - userRadios count:', userRadios.length);
  console.log('  - viewToggleButtons count:', viewToggleButtons.length);
}

// ============================================================================
// Initialization
// ============================================================================

async function init() {
  try {
    // Initialize DOM elements first
    initDOMElements();

    showLoading(true);
    console.log('Init starting...');

    // Load blueprint data (use relative path for GitHub Pages compatibility)
    console.log('Fetching blueprints.json...');
    const blueprintsResponse = await fetch('./blueprints.json');
    console.log('Blueprint response status:', blueprintsResponse.status);
    if (!blueprintsResponse.ok) throw new Error(`Failed to load blueprints.json: ${blueprintsResponse.status}`);
    appState.blueprints = await blueprintsResponse.json();
    console.log('✓ Blueprints loaded:', appState.blueprints.length);

    // Initialize user blueprint ownership maps
    USERS.forEach(user => {
      appState.userBlueprintsOwned[user] = {};
      appState.blueprints.forEach(bp => {
        appState.userBlueprintsOwned[user][bp.id] = false;
      });
    });
    console.log('✓ User maps initialized');

    // Load user data from Supabase (with timeout)
    console.log('Loading user data from Supabase...');
    const supabaseLoadPromise = loadUserBlueprintsFromSupabase();
    const timeoutPromise = new Promise(resolve => setTimeout(resolve, 3000)); // 3 second timeout
    await Promise.race([supabaseLoadPromise, timeoutPromise]);
    console.log('✓ Supabase data loaded (or timeout)');

    // Set up event listeners
    setupEventListeners();
    console.log('✓ Event listeners set up');

    // Set initial user if not selected
    if (!appState.currentUser) {
      appState.currentUser = USERS[0];
      userRadios[0].checked = true;
    }

    showLoading(false);
    console.log('✓ Init complete, rendering...');
    render();

  } catch (error) {
    console.error('✗ Init error:', error);
    showLoading(false);
    showError(`Initialization error: ${error.message}`);
  }
}

// ============================================================================
// Supabase Functions
// ============================================================================

async function loadUserBlueprintsFromSupabase() {
  const supabase = getSupabase();
  if (!supabase) {
    console.warn('Supabase not configured, using local state only');
    return;
  }

  try {
    // Fetch all user blueprints from Supabase
    const { data, error } = await supabase
      .from('user_blueprints')
      .select('user_id, blueprint_id, owned');

    if (error) {
      console.warn('Could not load from Supabase:', error.message);
      // Continue without loading from DB - use local state
      return;
    }

    if (data) {
      data.forEach(record => {
        if (record.user_id && appState.userBlueprintsOwned[record.user_id]) {
          appState.userBlueprintsOwned[record.user_id][record.blueprint_id] = record.owned || false;
        }
      });
    }
  } catch (error) {
    console.warn('Supabase load error:', error.message);
  }
}

async function saveBlueprintToSupabase(userId, blueprintId, owned) {
  const supabase = getSupabase();
  if (!supabase) {
    console.warn('Supabase not configured, changes are local only');
    return;
  }

  try {
    const { error } = await supabase
      .from('user_blueprints')
      .upsert({
        user_id: userId,
        blueprint_id: blueprintId,
        owned: owned,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,blueprint_id'
      });

    if (error) {
      console.error('Supabase save error:', error);
      throw error;
    }
  } catch (error) {
    console.warn('Could not save to Supabase:', error.message);
    // Continue - local state is still updated
  }
}

// ============================================================================
// Event Listeners
// ============================================================================

function setupEventListeners() {
  // User selection
  userRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      appState.currentUser = e.target.value;
      appState.viewMode = 'my-blueprints';
      appState.filterUser = null;
      updateViewToggleButtons();
      render();
    });
  });

  // View toggle buttons
  viewToggleButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const newView = e.target.getAttribute('data-view');
      appState.viewMode = newView;

      if (newView === 'other-users') {
        // Default to first other user
        appState.filterUser = USERS.find(u => u !== appState.currentUser) || USERS[0];
      } else {
        appState.filterUser = null;
      }

      updateViewToggleButtons();
      render();
    });
  });

  // Blueprint item clicks - handled in renderBlueprints
}

function updateViewToggleButtons() {
  viewToggleButtons.forEach(btn => {
    const view = btn.getAttribute('data-view');
    if (view === appState.viewMode) {
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
    } else {
      btn.classList.remove('active');
      btn.setAttribute('aria-pressed', 'false');
    }
  });
}

// ============================================================================
// Rendering
// ============================================================================

function render() {
  updateStatusMessage();
  renderBlueprints();
}

function updateStatusMessage() {
  if (!appState.currentUser) {
    statusText.textContent = 'Select a user to get started';
    return;
  }

  if (appState.viewMode === 'my-blueprints') {
    const owned = Object.values(appState.userBlueprintsOwned[appState.currentUser])
      .filter(Boolean).length;
    statusText.textContent = `${appState.currentUser} - ${owned} blueprint(s) checked`;
  } else {
    const filterName = appState.filterUser || 'user';
    const hasNotChecked = appState.blueprints.filter(bp =>
      !appState.userBlueprintsOwned[appState.filterUser][bp.id]
    ).length;
    statusText.textContent = `Showing ${hasNotChecked} blueprint(s) ${appState.filterUser} hasn't checked`;
  }
}

function renderBlueprints() {
  blueprintsContainer.innerHTML = '';

  const rarityOrder = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
  const blueprintsByRarity = {};

  // Group blueprints by rarity
  rarityOrder.forEach(rarity => {
    blueprintsByRarity[rarity] = appState.blueprints.filter(bp => bp.rarity === rarity);
  });

  // Render each rarity group
  rarityOrder.forEach(rarity => {
    const blueprintsInRarity = blueprintsByRarity[rarity];
    if (blueprintsInRarity.length === 0) return;

    // Create rarity group
    const rarityGroup = document.createElement('div');
    rarityGroup.className = 'blueprint-rarity-group';

    // Create rarity title
    const rarityTitle = document.createElement('h2');
    rarityTitle.className = `blueprint-rarity-title ${rarity.toLowerCase()}`;
    rarityTitle.textContent = `${rarity} (${blueprintsInRarity.length})`;
    rarityGroup.appendChild(rarityTitle);

    // Create blueprint grid for this rarity
    const grid = document.createElement('div');
    grid.className = 'blueprint-grid';

    // Filter blueprints based on view mode
    let filteredBlueprints = blueprintsInRarity;
    if (appState.viewMode === 'other-users' && appState.filterUser) {
      filteredBlueprints = blueprintsInRarity.filter(bp =>
        !appState.userBlueprintsOwned[appState.filterUser][bp.id]
      );
    }

    // Render each blueprint
    filteredBlueprints.forEach(blueprint => {
      const item = createBlueprintItem(blueprint);
      grid.appendChild(item);
    });

    rarityGroup.appendChild(grid);
    blueprintsContainer.appendChild(rarityGroup);
  });

  // Show message if no blueprints to display
  if (blueprintsContainer.children.length === 0) {
    const message = document.createElement('div');
    message.className = 'no-results';
    message.innerHTML = '<p>No blueprints to display</p>';
    blueprintsContainer.appendChild(message);
  }
}

function createBlueprintItem(blueprint) {
  const item = document.createElement('div');
  item.className = 'blueprint-item';

  const isOwned = appState.userBlueprintsOwned[appState.currentUser][blueprint.id];
  const ownerClass = appState.currentUser ? `owned-${appState.currentUser}` : '';

  if (isOwned) {
    item.classList.add(ownerClass);
  }

  // Icon image
  const icon = document.createElement('img');
  icon.className = 'blueprint-icon';
  icon.src = blueprint.icon_path;
  icon.alt = blueprint.name;
  item.appendChild(icon);

  // Checkbox overlay
  const checkbox = document.createElement('div');
  checkbox.className = 'blueprint-checkbox';
  if (isOwned) checkbox.classList.add('checked');
  checkbox.textContent = isOwned ? '✓' : '';
  item.appendChild(checkbox);

  // Blueprint name tooltip
  const title = document.createElement('div');
  title.className = 'blueprint-title';
  title.textContent = blueprint.name;
  item.appendChild(title);

  // Click handler
  item.addEventListener('click', async () => {
    if (!appState.currentUser) return;

    const newOwned = !appState.userBlueprintsOwned[appState.currentUser][blueprint.id];
    appState.userBlueprintsOwned[appState.currentUser][blueprint.id] = newOwned;

    // Save to Supabase
    await saveBlueprintToSupabase(appState.currentUser, blueprint.id, newOwned);

    // Re-render
    render();
  });

  return item;
}

// ============================================================================
// Utility Functions
// ============================================================================

function showLoading(show) {
  if (!loadingSpinner) {
    console.warn('Loading spinner element not found');
    return;
  }

  if (show) {
    loadingSpinner.removeAttribute('hidden');
    loadingSpinner.style.display = 'flex';
    console.log('✓ Showing loading spinner');
  } else {
    loadingSpinner.setAttribute('hidden', '');
    loadingSpinner.style.display = 'none';
    console.log('✓ Hiding loading spinner');
  }
}

function showError(message) {
  errorDiv.textContent = message;
  errorDiv.removeAttribute('hidden');
  setTimeout(() => {
    errorDiv.setAttribute('hidden', '');
  }, 5000);
}

// ============================================================================
// Start the app
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Give the Supabase library time to load from CDN
  setTimeout(init, 100);
});



