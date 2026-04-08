// ============================================================================
// Arc Raiders Blueprint Tracker - Frontend JavaScript
// ============================================================================

const USERS = ['aleks', 'rudi', 'publicsweatyvoid', 'chrischtn'];

// User display name mapping
const USER_DISPLAY_NAMES = {
  'aleks': 'Aleks',
  'rudi': 'Rudi',
  'publicsweatyvoid': 'Su-Nam',
  'chrischtn': 'Chrischtn'
};

// Supabase instance (initialized after library loads)
// Don't declare as 'let supabase' because the library already creates window.supabase

function getSupabase() {
   if (typeof SUPABASE_CONFIG !== 'undefined' && typeof window.supabase !== 'undefined') {
     // Create client if not already created
     if (!window.supabaseClient) {
       try {
         const { createClient } = window.supabase;
         window.supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);
       } catch (error) {
         console.error('Failed to create Supabase client:', error);
         return null;
       }
     }
     return window.supabaseClient;
   }
    return null;
  }

// Get latest commit information from GitHub API
async function getLatestCommitInfo() {
  const owner = 'snmpark';
  const repo = 'blueprints-tracker';
  const branch = 'main';

  try {
    // Fetch from GitHub API
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits/${branch}`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      return {
        hash: data.sha.substring(0, 7),
        message: data.commit.message, // Full message with body
        date: new Date(data.commit.author.date).toLocaleString(),
        author: data.commit.author.name,
        url: data.html_url
      };
    } else if (response.status === 403) {
      console.warn('GitHub API rate limited or no auth');
    }
  } catch (error) {
    console.log('Failed to fetch from GitHub API:', error.message);
  }

  // Fallback: try to get from git info file if it exists
  try {
    const response = await fetch('./git-info.json');
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.log('Git info file not available');
  }

  return null;
}

// App state
let appState = {
  blueprints: [],
  sortedBlueprints: null, // Cached sorted blueprints
  currentUser: null,
  userBlueprintsOwned: {}, // { user: { blueprintId: boolean } }
  isLocked: true, // Lock state to prevent accidental changes
  displayMode: 'overview' // 'overview', 'list', or 'missing'
};

// ============================================================================
// DOM Elements
// ============================================================================

// Magic number constants
const SUPABASE_TIMEOUT_MS = 3000;
const LONG_PRESS_DELAY_MS = 500;
const POPUP_AUTO_HIDE_MS = 5000;

let statusText;
let blueprintsContainer;
let loadingSpinner;
let errorDiv;

// Cached DOM element references
let cachedUserButtons = null;
let cachedOverviewContainer = null;
let cachedOverviewSection = null;
let cachedUnlockBtn = null;
let cachedOverviewViewBtn = null;
let cachedListViewBtn = null;
let cachedMissingViewBtn = null;

function initDOMElements() {
    statusText = document.getElementById('status-text');
    blueprintsContainer = document.getElementById('blueprints-container');
    loadingSpinner = document.getElementById('loading');
    errorDiv = document.getElementById('error');
    // Cache frequently accessed elements
    cachedUserButtons = document.querySelectorAll('.user-btn');
    cachedOverviewContainer = document.getElementById('overview-container');
    cachedOverviewSection = document.getElementById('overview-section');
    cachedUnlockBtn = document.getElementById('unlock-btn');
    cachedOverviewViewBtn = document.getElementById('overview-view-btn');
    cachedListViewBtn = document.getElementById('list-view-btn');
    cachedMissingViewBtn = document.getElementById('missing-view-btn');
  }

// ============================================================================
// Initialization
// ============================================================================

async function init() {
    try {
      // Initialize DOM elements first (must be done before any DOM operations)
      initDOMElements();

      showLoading(true);

      // Load blueprint data (use relative path for GitHub Pages compatibility)
      const blueprintsResponse = await fetch('./blueprints.json');
      if (!blueprintsResponse.ok) {
        throw new Error(`Failed to load blueprints.json: ${blueprintsResponse.status}`);
      }
      appState.blueprints = await blueprintsResponse.json();

      if (!appState.blueprints || appState.blueprints.length === 0) {
        throw new Error('No blueprints data loaded');
      }

      // Pre-sort blueprints once and cache
      appState.sortedBlueprints = [...appState.blueprints].sort((a, b) => (a.order_id || 0) - (b.order_id || 0));

      // Initialize user blueprint ownership maps
      USERS.forEach(user => {
        appState.userBlueprintsOwned[user] = {};
        appState.blueprints.forEach(bp => {
          appState.userBlueprintsOwned[user][bp.id] = false;
        });
      });

      // Load user data from Supabase (with timeout)
      const supabaseLoadPromise = loadUserBlueprintsFromSupabase();
      const timeoutPromise = new Promise(resolve => setTimeout(resolve, SUPABASE_TIMEOUT_MS));
      await Promise.race([supabaseLoadPromise, timeoutPromise]);

      // Set up event listeners
      setupEventListeners();

       // Set initial user if not selected
        if (!appState.currentUser) {
          appState.currentUser = USERS[0];
          updateUserButtonStates();
        }

        showLoading(false);
        render();

    } catch (error) {
      console.error('Initialization error:', error);
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
       console.warn('Could not save to Supabase:', error.message);
     }
   } catch (error) {
     console.warn('Could not save to Supabase:', error.message);
     // Continue - local state is still updated
   }
}

// ============================================================================
// Event Listeners
// ============================================================================

let eventListenersInitialized = false;

function setupEventListeners() {
      // Only initialize once to prevent duplicate listeners
      if (eventListenersInitialized) return;
      eventListenersInitialized = true;

      // User selection buttons
       document.querySelectorAll('.user-btn').forEach(btn => {
         btn.addEventListener('click', (e) => {
           e.preventDefault();
           appState.currentUser = btn.dataset.user;
           // Reset displayMode to overview when switching users
           appState.displayMode = 'overview';
           updateUserButtonStates();
           updateViewToggleButtons();
           updateStatusMessage();
           render();
         });
       });

          // Using event delegation for view toggle and other controls
        document.addEventListener('click', (e) => {
            // Overview view button - use closest() for better mobile support
            if (e.target && e.target.closest('#overview-view-btn')) {
              e.preventDefault();
              appState.displayMode = 'overview';
              updateViewToggleButtons();
              render();
            }

            // List view button - use closest() for better mobile support
            if (e.target && e.target.closest('#list-view-btn')) {
              e.preventDefault();
              appState.displayMode = 'list';
              updateViewToggleButtons();
              render();
            }

            // Missing view button - use closest() for better mobile support
            if (e.target && e.target.closest('#missing-view-btn')) {
              e.preventDefault();
              appState.displayMode = 'missing';
              updateViewToggleButtons();
              render();
            }

            // Unlock button toggle - use closest() for better mobile support
            if (e.target && e.target.closest('#unlock-btn')) {
              e.preventDefault();
              appState.isLocked = !appState.isLocked;
              updateViewToggleButtons();
            }

            // Changelog button - use closest() for better mobile support
            if (e.target && e.target.closest('#changelog-btn')) {
              e.preventDefault();
              showChangelogModal();
            }

            // Close changelog modal - use closest() for better mobile support
            if (e.target && e.target.closest('#changelog-close')) {
              e.preventDefault();
              closeChangelogModal();
            }

            // Close modal if clicking outside
            if (e.target && e.target.id === 'changelog-modal') {
              closeChangelogModal();
            }

            // Hide blueprint tooltips when clicking elsewhere
            if (!e.target.closest('.blueprint-item')) {
              document.querySelectorAll('.blueprint-item').forEach(i => i.classList.remove('show-title'));
            }
          });

       // Blueprint item clicks - handled in renderBlueprints
     }

function updateUserButtonStates() {
  if (!cachedUserButtons) {
    cachedUserButtons = document.querySelectorAll('.user-btn');
  }
  cachedUserButtons.forEach(btn => {
    if (btn.dataset.user === appState.currentUser) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}


function updateViewToggleButtons() {
     const unlockBtn = cachedUnlockBtn;
     const overviewViewBtn = cachedOverviewViewBtn;
     const listViewBtn = cachedListViewBtn;
     const missingViewBtn = cachedMissingViewBtn;

     // Update overview/list/missing view buttons
     if (overviewViewBtn) {
       const isOverview = appState.displayMode === 'overview';
       overviewViewBtn.classList.toggle('active', isOverview);
       overviewViewBtn.setAttribute('aria-pressed', String(isOverview));
     }

     if (listViewBtn) {
       const isList = appState.displayMode === 'list';
       listViewBtn.classList.toggle('active', isList);
       listViewBtn.setAttribute('aria-pressed', String(isList));
     }

     if (missingViewBtn) {
       const isMissing = appState.displayMode === 'missing';
       missingViewBtn.classList.toggle('active', isMissing);
       missingViewBtn.setAttribute('aria-pressed', String(isMissing));
     }

     // Update lock button
     if (unlockBtn) {
       const isLocked = appState.isLocked;
       unlockBtn.classList.toggle('active', !isLocked);
       unlockBtn.setAttribute('aria-pressed', String(!isLocked));
       unlockBtn.textContent = isLocked ? '🔒' : '🔓';
       unlockBtn.title = isLocked
         ? 'Click to unlock and allow changes'
         : 'Click to lock and prevent accidental changes';
     }
   }

function updateBlueprintOwnershipDisplay() {
  if (!appState.currentUser || !blueprintsContainer) return;

  const allItems = blueprintsContainer.querySelectorAll('.blueprint-item');
  if (allItems.length === 0) return;

  const currentUser = appState.currentUser;
  const userOwnership = appState.userBlueprintsOwned[currentUser];
  
  allItems.forEach(item => {
    const blueprintId = parseInt(item.dataset.blueprintId, 10);
    const isOwned = userOwnership[blueprintId];

     // Remove all user-specific classes
     item.classList.remove('owned-aleks', 'owned-rudi', 'owned-publicsweatyvoid', 'owned-chrischtn');

    // Update checkbox
    const checkbox = item.querySelector('.blueprint-checkbox');
    if (isOwned) {
      item.classList.add(`owned-${currentUser}`);
      checkbox.classList.add('checked');
      checkbox.textContent = '✓';
    } else {
      checkbox.classList.remove('checked');
      checkbox.textContent = '';
    }
  });
}

async function showChangelogModal() {
  const modal = document.getElementById('changelog-modal');
  const content = document.getElementById('changelog-content');

  if (!modal) return;

  // Show loading state
  content.innerHTML = '<p>Loading changelog from GitHub...</p>';
  modal.removeAttribute('hidden');

  // Fetch commit info
  const commitInfo = await getLatestCommitInfo();

  if (commitInfo) {
    const commitLink = commitInfo.url
      ? `<a href="${commitInfo.url}" target="_blank" rel="noopener noreferrer" class="commit-link">View Commit on GitHub ↗</a>`
      : '';

    content.innerHTML = `
      <div class="changelog-item">
        <p>${escapeHtml(commitInfo.message).replace(/\n/g, '<br>')}</p>
        ${commitLink}
      </div>
    `;
  } else {
    content.innerHTML = '<p>Unable to load changelog from GitHub API.</p>';
  }
}

function closeChangelogModal() {
  const modal = document.getElementById('changelog-modal');
  if (modal) {
    modal.setAttribute('hidden', '');
  }
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// ============================================================================
// Long-Press Handler (Reusable)
// ============================================================================

function createLongPressHandler(element, displayText) {
  let touchTimer;
  let touchStarted = false;

  const showPopup = () => {
    const popup = document.createElement('div');
    popup.className = 'blueprint-popup';
    popup.textContent = displayText;
    document.body.appendChild(popup);

    // Hide popup on tap or after timeout
    const hidePopup = () => {
      if (popup.parentNode) {
        popup.remove();
      }
      document.removeEventListener('click', hidePopup);
      document.removeEventListener('touchstart', hidePopup);
    };

    document.addEventListener('click', hidePopup);
    document.addEventListener('touchstart', hidePopup);

    // Auto-hide after timeout
    setTimeout(() => {
      if (popup.parentNode) popup.remove();
    }, POPUP_AUTO_HIDE_MS);
  };

  element.addEventListener('touchstart', () => {
    touchStarted = true;
    touchTimer = setTimeout(() => {
      if (touchStarted) {
        showPopup();
      }
    }, LONG_PRESS_DELAY_MS);
  }, { passive: true });

  element.addEventListener('touchend', () => {
    touchStarted = false;
    clearTimeout(touchTimer);
  }, { passive: true });

  element.addEventListener('touchmove', () => {
    touchStarted = false;
    clearTimeout(touchTimer);
  }, { passive: true });

  element.addEventListener('touchcancel', () => {
    touchStarted = false;
    clearTimeout(touchTimer);
  }, { passive: true });
}

// ============================================================================
// Rendering
// ============================================================================

function render() {
      updateStatusMessage();

      // Show or hide content based on display mode
      const overviewSection = cachedOverviewSection || document.getElementById('overview-section');

      if (appState.displayMode === 'overview') {
        // Show overview, hide list
        if (overviewSection) overviewSection.removeAttribute('hidden');
        if (blueprintsContainer) {
          blueprintsContainer.setAttribute('hidden', '');
          blueprintsContainer.innerHTML = '';
        }
        blueprintsDelegationSetup = false; // Reset flag when leaving blueprints view
        renderOverview();
      } else if (appState.displayMode === 'list') {
        // Show list, hide overview
        if (overviewSection) overviewSection.setAttribute('hidden', '');
        if (blueprintsContainer) blueprintsContainer.removeAttribute('hidden');
        overviewDelegationSetup = false; // Reset flag when leaving overview
        renderBlueprintsList();
      } else if (appState.displayMode === 'missing') {
        // Show missing view, hide overview
        if (overviewSection) overviewSection.setAttribute('hidden', '');
        if (blueprintsContainer) blueprintsContainer.removeAttribute('hidden');
        overviewDelegationSetup = false; // Reset flag when leaving overview
        renderMissingBlueprints();
      }
    }

function updateStatusMessage() {
      if (!appState.currentUser) {
        statusText.textContent = 'Select a user to get started';
        return;
      }

      const displayName = USER_DISPLAY_NAMES[appState.currentUser];

      if (appState.displayMode === 'missing') {
        const missing = appState.blueprints.filter(bp =>
          !appState.userBlueprintsOwned[appState.currentUser][bp.id]
        ).length;
        statusText.textContent = `${displayName} - ${missing} blueprint(s) missing`;
      } else {
        const owned = Object.values(appState.userBlueprintsOwned[appState.currentUser])
          .filter(Boolean).length;
        statusText.textContent = `${displayName} - ${owned} blueprint(s) owned`;
      }
    }

function renderOverview() {
  const overviewContainer = cachedOverviewContainer || document.getElementById('overview-container');

  if (!overviewContainer || !appState.currentUser) return;

  // Use DocumentFragment for batch DOM operations
  const fragment = document.createDocumentFragment();

  // Use cached sorted blueprints
  const sortedBlueprints = appState.sortedBlueprints;

  // Render overview for current user only
  const user = appState.currentUser;
  const userOwnership = appState.userBlueprintsOwned[user];

  // Create user grid section
  const userGrid = document.createElement('div');
  userGrid.className = 'overview-user-grid';

  // User label
  const userLabel = document.createElement('div');
  userLabel.className = 'overview-user-label';
  userLabel.textContent = user;
  userGrid.appendChild(userLabel);

  // Grid container
  const grid = document.createElement('div');
  grid.className = 'overview-grid';

     // Add all blueprints in order, showing owned ones or empty spaces
     sortedBlueprints.forEach((blueprint) => {
       const isOwned = userOwnership[blueprint.id];

      if (isOwned) {
        // Show owned blueprint
        const item = document.createElement('div');
        item.className = `overview-blueprint-item owned-${user}`;
        item.dataset.blueprintId = blueprint.id;
        item.dataset.blueprintName = blueprint.name;
        item.title = blueprint.name;

        const icon = document.createElement('img');
        icon.className = 'overview-blueprint-icon';
        icon.src = blueprint.icon_path;
        icon.alt = blueprint.name;
        icon.loading = 'lazy'; // Lazy load images
        item.appendChild(icon);

        // Add checkmark to top right
        const checkmark = document.createElement('div');
        checkmark.className = 'overview-blueprint-checkmark';
        checkmark.textContent = '✓';
        item.appendChild(checkmark);

        grid.appendChild(item);
      } else {
        // Create empty placeholder to maintain grid structure
        const emptyItem = document.createElement('div');
        emptyItem.className = 'overview-blueprint-item overview-empty-slot';
        emptyItem.dataset.blueprintId = blueprint.id;
        emptyItem.dataset.blueprintName = `${blueprint.name} (Missing)`;
        emptyItem.title = blueprint.name;

        grid.appendChild(emptyItem);
      }
    });

  userGrid.appendChild(grid);
  fragment.appendChild(userGrid);
  
  // Clear and append in one operation
  overviewContainer.innerHTML = '';
  overviewContainer.appendChild(fragment);

  // Setup event delegation once (not per item)
  setupOverviewEventDelegation(overviewContainer);
}

// Track if delegation is already set up to avoid duplicates
let overviewDelegationSetup = false;

function setupOverviewEventDelegation(container) {
  if (overviewDelegationSetup) return;
  overviewDelegationSetup = true;

  // Click handler for toggling owned state (when unlocked)
  container.addEventListener('click', async (e) => {
    const item = e.target.closest('.overview-blueprint-item');
    if (!item) return;

    e.stopPropagation();

    // Only allow toggling if unlocked
    if (appState.isLocked) {
      item.classList.add('locked-flash');
      const flashTimeout = setTimeout(() => {
        item.classList.remove('locked-flash');
      }, 300);
      // Store timeout ID for cleanup if needed
      return;
    }

    const blueprintId = parseInt(item.dataset.blueprintId, 10);
    if (!blueprintId || !appState.currentUser) return;

    // Toggle ownership
    const newOwned = !appState.userBlueprintsOwned[appState.currentUser][blueprintId];
    appState.userBlueprintsOwned[appState.currentUser][blueprintId] = newOwned;

    // Save to Supabase
    await saveBlueprintToSupabase(appState.currentUser, blueprintId, newOwned);

    // Re-render overview (don't reset delegation flag)
    renderOverview();
    updateStatusMessage();
  });

  // Long-press handler via touch events with delegation
  let touchTimer;
  let touchStarted = false;
  let touchedItem = null;
  let activePopupTimeout = null;

  const showPopup = (displayText) => {
    const popup = document.createElement('div');
    popup.className = 'blueprint-popup';
    popup.textContent = displayText;
    document.body.appendChild(popup);

    const hidePopup = () => {
      if (popup.parentNode) {
        popup.remove();
      }
      document.removeEventListener('click', hidePopup);
      document.removeEventListener('touchstart', hidePopup);
      // Clear the timeout reference
      if (activePopupTimeout) {
        clearTimeout(activePopupTimeout);
        activePopupTimeout = null;
      }
    };

    document.addEventListener('click', hidePopup);
    document.addEventListener('touchstart', hidePopup, { passive: true });

    // Auto-hide popup after timeout and cleanup listeners
    activePopupTimeout = setTimeout(() => {
      hidePopup();
    }, POPUP_AUTO_HIDE_MS);
  };

  container.addEventListener('touchstart', (e) => {
    const item = e.target.closest('.overview-blueprint-item');
    if (!item) return;

    touchedItem = item;
    touchStarted = true;
    touchTimer = setTimeout(() => {
      if (touchStarted && touchedItem) {
        showPopup(touchedItem.dataset.blueprintName || '');
      }
    }, LONG_PRESS_DELAY_MS);
  }, { passive: true });

  container.addEventListener('touchend', () => {
    touchStarted = false;
    touchedItem = null;
    clearTimeout(touchTimer);
  }, { passive: true });

  container.addEventListener('touchmove', () => {
    touchStarted = false;
    touchedItem = null;
    clearTimeout(touchTimer);
  }, { passive: true });

  container.addEventListener('touchcancel', () => {
    touchStarted = false;
    touchedItem = null;
    clearTimeout(touchTimer);
  }, { passive: true });
}

function renderBlueprintsList() {
    // Use DocumentFragment for batch DOM operations
    const fragment = document.createDocumentFragment();

    const rarityOrder = ['Legendary', 'Epic', 'Rare', 'Uncommon', 'Common'];

    // Group blueprints by rarity
    const blueprintsByRarity = {};
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

      // Create blueprint grid for this rarity
      const grid = document.createElement('div');
      grid.className = 'blueprint-grid';

      // Create rarity title
      const rarityTitle = document.createElement('h2');
      rarityTitle.className = `blueprint-rarity-title ${rarity.toLowerCase()}`;
      rarityTitle.textContent = `${rarity} (${blueprintsInRarity.length})`;
      rarityGroup.appendChild(rarityTitle);

      // Render each blueprint
      blueprintsInRarity.forEach(blueprint => {
        const item = createBlueprintItemElement(blueprint);
        grid.appendChild(item);
      });

      rarityGroup.appendChild(grid);
      fragment.appendChild(rarityGroup);
    });

   // Clear and append in one operation
   blueprintsContainer.innerHTML = '';

   // Show message if no blueprints to display
   if (fragment.children.length === 0) {
     const message = document.createElement('div');
     message.className = 'no-results';
     message.innerHTML = '<p>No blueprints to display</p>';
     blueprintsContainer.appendChild(message);
   } else {
     blueprintsContainer.appendChild(fragment);
   }

   // Setup event delegation for blueprint items
   setupBlueprintsEventDelegation();
}

// Track if delegation is already set up to avoid duplicates
let blueprintsDelegationSetup = false;

function setupBlueprintsEventDelegation() {
  if (blueprintsDelegationSetup) return;
  blueprintsDelegationSetup = true;

  // Click handler with event delegation (only for .blueprint-item, not .missing-blueprint-item)
  blueprintsContainer.addEventListener('click', async (e) => {
    const item = e.target.closest('.blueprint-item');
    if (!item || !appState.currentUser) return;

    // Prevent changes if locked
    if (appState.isLocked) {
      item.classList.add('locked-flash');
      setTimeout(() => {
        item.classList.remove('locked-flash');
      }, 300);
      return;
    }

    const blueprintId = parseInt(item.dataset.blueprintId, 10);
    if (!blueprintId) return;

    const newOwned = !appState.userBlueprintsOwned[appState.currentUser][blueprintId];
    appState.userBlueprintsOwned[appState.currentUser][blueprintId] = newOwned;

    // Save to Supabase
    await saveBlueprintToSupabase(appState.currentUser, blueprintId, newOwned);

    // Update only the checkbox and ownership display (no full re-render)
    updateBlueprintOwnershipDisplay();
    updateStatusMessage();
  });

  // Prevent context menu on long-press
  blueprintsContainer.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.blueprint-item')) {
      e.preventDefault();
      return false;
    }
  });

  // Long-press handler via touch events with delegation (only for .blueprint-item, not .missing-blueprint-item)
  let touchTimer;
  let touchStarted = false;
  let touchedItem = null;
  let activePopupTimeout = null;

  const showPopup = (displayText) => {
    const popup = document.createElement('div');
    popup.className = 'blueprint-popup';
    popup.textContent = displayText;
    document.body.appendChild(popup);

    const hidePopup = () => {
      if (popup.parentNode) {
        popup.remove();
      }
      document.removeEventListener('click', hidePopup);
      document.removeEventListener('touchstart', hidePopup);
      // Clear the timeout reference
      if (activePopupTimeout) {
        clearTimeout(activePopupTimeout);
        activePopupTimeout = null;
      }
    };

    document.addEventListener('click', hidePopup);
    document.addEventListener('touchstart', hidePopup, { passive: true });

    // Auto-hide popup after timeout and cleanup listeners
    activePopupTimeout = setTimeout(() => {
      hidePopup();
    }, POPUP_AUTO_HIDE_MS);
  };

  blueprintsContainer.addEventListener('touchstart', (e) => {
    // Only handle .blueprint-item, not .missing-blueprint-item
    const item = e.target.closest('.blueprint-item');
    if (!item) return;

    touchedItem = item;
    touchStarted = true;
    touchTimer = setTimeout(() => {
      if (touchStarted && touchedItem) {
        showPopup(touchedItem.dataset.blueprintName || '');
      }
    }, LONG_PRESS_DELAY_MS);
  }, { passive: true });

  blueprintsContainer.addEventListener('touchend', () => {
    touchStarted = false;
    touchedItem = null;
    clearTimeout(touchTimer);
  }, { passive: true });

  blueprintsContainer.addEventListener('touchmove', () => {
    touchStarted = false;
    touchedItem = null;
    clearTimeout(touchTimer);
  }, { passive: true });

  blueprintsContainer.addEventListener('touchcancel', () => {
    touchStarted = false;
    touchedItem = null;
    clearTimeout(touchTimer);
  }, { passive: true });
}

function createBlueprintItemElement(blueprint) {
    const item = document.createElement('div');
    item.className = 'blueprint-item';
    item.dataset.blueprintId = blueprint.id;
    item.dataset.blueprintName = blueprint.name;

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
    icon.loading = 'lazy'; // Lazy load images
    item.appendChild(icon);

    // Checkbox overlay
    const checkbox = document.createElement('div');
    checkbox.className = 'blueprint-checkbox';
    if (isOwned) checkbox.classList.add('checked');
    checkbox.textContent = isOwned ? '✓' : '';
    item.appendChild(checkbox);

    // Blueprint name label under icon
    const label = document.createElement('div');
    label.className = 'blueprint-label';
    label.textContent = blueprint.name;
    item.appendChild(label);

    // Blueprint name tooltip
    const title = document.createElement('div');
    title.className = 'blueprint-title';
    title.textContent = blueprint.name;
    item.appendChild(title);

    return item;
}

function renderMissingBlueprints() {
    if (!appState.currentUser) {
      blueprintsContainer.innerHTML = '';
      return;
    }

    const userOwnership = appState.userBlueprintsOwned[appState.currentUser];

    // Filter to only missing blueprints and sort alphabetically by name
    const missingBlueprints = appState.blueprints
      .filter(bp => !userOwnership[bp.id])
      .sort((a, b) => a.name.localeCompare(b.name));

    // Use DocumentFragment for batch DOM operations
    const fragment = document.createDocumentFragment();

    if (missingBlueprints.length === 0) {
      const message = document.createElement('div');
      message.className = 'no-results';
      message.innerHTML = '<p>No missing blueprints!</p>';
      fragment.appendChild(message);
    } else {
      // Create single container for all missing blueprints (no rarity grouping)
      const container = document.createElement('div');
      container.className = 'missing-blueprints-container';

      // Create header
      const header = document.createElement('h2');
      header.className = 'missing-blueprints-title';
      header.textContent = `Missing Blueprints (${missingBlueprints.length})`;
      container.appendChild(header);

      // Create list view
      const list = document.createElement('div');
      list.className = 'missing-blueprints-list';

      // Render each missing blueprint
      missingBlueprints.forEach(blueprint => {
        const item = createMissingBlueprintItemElement(blueprint);
        list.appendChild(item);
      });

      container.appendChild(list);
      fragment.appendChild(container);
    }

    // Clear and append in one operation
    blueprintsContainer.innerHTML = '';
    blueprintsContainer.appendChild(fragment);

    // Setup event delegation (reuses the same handler)
    setupBlueprintsEventDelegation();
}

function createMissingBlueprintItemElement(blueprint) {
    const item = document.createElement('div');
    item.className = 'missing-blueprint-item';
    item.dataset.blueprintId = blueprint.id;
    item.dataset.blueprintName = blueprint.name;

    // Icon image
    const icon = document.createElement('img');
    icon.className = 'missing-blueprint-icon';
    icon.src = blueprint.icon_path;
    icon.alt = blueprint.name;
    icon.loading = 'lazy'; // Lazy load images
    item.appendChild(icon);

    // Blueprint info container
    const info = document.createElement('div');
    info.className = 'missing-blueprint-info';

    // Blueprint name
    const name = document.createElement('div');
    name.className = 'missing-blueprint-name';
    name.textContent = blueprint.name;
    info.appendChild(name);

    // Blueprint rarity
    const rarity = document.createElement('div');
    rarity.className = `missing-blueprint-rarity ${blueprint.rarity.toLowerCase()}`;
    rarity.textContent = blueprint.rarity;
    info.appendChild(rarity);

    item.appendChild(info);


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
  } else {
    loadingSpinner.setAttribute('hidden', '');
    loadingSpinner.style.display = 'none';
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

document.addEventListener('DOMContentLoaded', init);
