// TCG Investor Pro - Main JavaScript File
// This file handles all the interactive functionality of the application

// Global state management
const AppState = {
    currentSection: 'dashboard',
    mockData: null,
    searchResults: [],
    portfolio: [],
    watchlist: [],
    currentUser: null,
    isInitialized: false
};

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

/**
 * Initialize the application
 * Sets up event listeners, loads mock data, and renders initial content
 */
async function initializeApp() {
    console.log('🚀 Initializing TCG Investor Pro...');
    
    try {
        // Initialize Supabase first (optional)
        const supabaseConnected = await initializeSupabase();
        
        // Set up navigation
        setupNavigation();
        
        // Set up search functionality
        setupSearch();
        
        // Set up filters
        setupFilters();
        
        // Set up modal functionality
        setupModal();
        
        // Set up case cracker
        setupCaseCracker();
        
        // Set up profile tabs
        setupProfileTabs();
        
        // Set up authentication
        setupAuthentication();
        
        // Load data (real or mock)
        if (supabaseConnected) {
            await loadInitialData();
        } else {
            loadMockData();
        }
        
        // Render initial dashboard
        renderDashboard();
        
        AppState.isInitialized = true;
        console.log('✅ App initialized successfully!');
        
    } catch (error) {
        console.error('❌ App initialization failed:', error);
        // Fallback to mock data if real data fails
        loadMockData();
        renderDashboard();
    }
}

/**
 * Initialize Supabase connection
 */
async function initializeSupabase() {
    try {
        const { SUPABASE_CONFIG, initializeSupabase } = window.SupabaseConfig;
        
        if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey) {
            console.warn('Supabase configuration missing, using fallback');
            return false;
        }
        
        const client = initializeSupabase(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        
        if (!client) {
            console.warn('Failed to initialize Supabase client');
            return false;
        }
        
        // Test connection
        const isConnected = await window.SupabaseConfig.testSupabaseConnection();
        if (!isConnected) {
            console.warn('Supabase connection test failed');
            return false;
        }
        
        console.log('✅ Supabase initialized successfully');
        return true;
    } catch (error) {
        console.warn('Supabase initialization failed:', error);
        return false;
    }
}

/**
 * Set up navigation between sections
 * Handles clicking on nav links and showing/hiding sections
 */
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetSection = this.getAttribute('data-section');
            
            // Update active nav link
            navLinks.forEach(navLink => navLink.classList.remove('active'));
            this.classList.add('active');
            
            // Show target section
            sections.forEach(section => section.classList.remove('active'));
            document.getElementById(targetSection).classList.add('active');
            
            // Update app state
            AppState.currentSection = targetSection;
            
            // Render section-specific content
            renderSection(targetSection);
        });
    });
}

/**
 * Render section-specific content
 * @param {string} section - The section to render
 */
function renderSection(section) {
    switch(section) {
        case 'dashboard':
            renderDashboard();
            break;
        case 'portfolio':
            renderPortfolio();
            break;
        case 'watchlist':
            renderWatchlist();
            break;
        case 'case-cracker':
            renderCaseCracker();
            break;
        case 'profile':
            renderProfile();
            break;
    }
}

/**
 * Set up search functionality
 * Handles the main search input and search button
 */
function setupSearch() {
    const searchInput = document.getElementById('cardSearch');
    const searchBtn = document.getElementById('searchBtn');
    
    // Search on button click
    searchBtn.addEventListener('click', performSearch);
    
    // Search on Enter key
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    // Real-time search suggestions (debounced)
    let searchTimeout;
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            if (this.value.length > 2) {
                showSearchSuggestions(this.value);
            }
        }, 300);
    });
}

/**
 * Perform search with current filters
 */
function performSearch() {
    const searchTerm = document.getElementById('cardSearch').value.toLowerCase();
    const filters = getActiveFilters();
    
    showLoading(true);
    
    // Simulate API call delay
    setTimeout(() => {
        const results = searchCards(searchTerm, filters);
        AppState.searchResults = results;
        displaySearchResults(results);
        showLoading(false);
    }, 1000);
}

/**
 * Get active filter values
 * @returns {Object} Filter values
 */
function getActiveFilters() {
    return {
        set: document.getElementById('setFilter').value,
        type: document.getElementById('typeFilter').value,
        rarity: document.getElementById('rarityFilter').value,
        priceMin: parseFloat(document.getElementById('priceMin').value) || 0,
        priceMax: parseFloat(document.getElementById('priceMax').value) || Infinity,
        roiMin: parseFloat(document.getElementById('roiMin').value) || 0,
        roiMax: parseFloat(document.getElementById('roiMax').value) || Infinity,
        sortBy: document.getElementById('sortBy').value
    };
}

/**
 * Search cards based on term and filters
 * @param {string} searchTerm - Search term
 * @param {Object} filters - Filter options
 * @returns {Array} Filtered and sorted results
 */
function searchCards(searchTerm, filters) {
    if (!AppState.mockData) return [];
    
    let results = AppState.mockData.cards.filter(card => {
        // Text search
        const matchesSearch = !searchTerm || 
            card.name.toLowerCase().includes(searchTerm) ||
            card.set.toLowerCase().includes(searchTerm) ||
            card.number.toLowerCase().includes(searchTerm);
        
        // Filter by set
        const matchesSet = !filters.set || card.setId === filters.set;
        
        // Filter by type
        const matchesType = !filters.type || card.type === filters.type;
        
        // Filter by rarity
        const matchesRarity = !filters.rarity || card.rarity === filters.rarity;
        
        // Filter by price range
        const matchesPrice = card.ungradedPrice >= filters.priceMin && 
                           card.ungradedPrice <= filters.priceMax;
        
        // Filter by ROI range
        const matchesROI = card.roi >= filters.roiMin && card.roi <= filters.roiMax;
        
        return matchesSearch && matchesSet && matchesType && 
               matchesRarity && matchesPrice && matchesROI;
    });
    
    // Sort results
    results = sortCards(results, filters.sortBy);
    
    return results;
}

/**
 * Sort cards based on criteria
 * @param {Array} cards - Array of cards
 * @param {string} sortBy - Sort criteria
 * @returns {Array} Sorted cards
 */
function sortCards(cards, sortBy) {
    return cards.sort((a, b) => {
        switch(sortBy) {
            case 'price-desc':
                return b.ungradedPrice - a.ungradedPrice;
            case 'price-asc':
                return a.ungradedPrice - b.ungradedPrice;
            case 'roi-desc':
                return b.roi - a.roi;
            case 'roi-asc':
                return a.roi - b.roi;
            case 'name':
                return a.name.localeCompare(b.name);
            case 'trending':
                return b.trending - a.trending;
            default:
                return 0;
        }
    });
}

/**
 * Display search results
 * @param {Array} results - Search results
 */
function displaySearchResults(results) {
    const resultsContainer = document.createElement('div');
    resultsContainer.className = 'search-results';
    
    if (results.length === 0) {
        resultsContainer.innerHTML = `
            <div class="empty-state">
                <p>No cards found matching your criteria. Try adjusting your filters.</p>
            </div>
        `;
    } else {
        resultsContainer.innerHTML = `
            <div class="results-header">
                <h3>Search Results (${results.length} cards found)</h3>
            </div>
            <div class="cards-grid">
                ${results.map(card => createCardHTML(card)).join('')}
            </div>
        `;
    }
    
    // Insert after search section
    const searchSection = document.querySelector('.search-section');
    const existingResults = document.querySelector('.search-results');
    if (existingResults) {
        existingResults.remove();
    }
    searchSection.insertAdjacentElement('afterend', resultsContainer);
}

/**
 * Create HTML for a card item
 * @param {Object} card - Card data
 * @returns {string} HTML string
 */
function createCardHTML(card) {
    const roiClass = card.roi > 0 ? 'text-success' : card.roi < 0 ? 'text-error' : '';
    
    return `
        <div class="card-item" onclick="showCardDetail('${card.id}')">
            <div class="card-image">
                ${card.image ? `<img src="${card.image}" alt="${card.name}">` : '🃏'}
            </div>
            <div class="card-content">
                <div class="card-name">${card.name}</div>
                <div class="card-set">${card.set} #${card.number}</div>
                <div class="card-price">$${card.ungradedPrice.toFixed(2)}</div>
                <div class="card-roi ${roiClass}">${card.roi > 0 ? '+' : ''}${card.roi.toFixed(1)}% ROI</div>
            </div>
        </div>
    `;
}

/**
 * Set up filter functionality
 */
function setupFilters() {
    const applyBtn = document.getElementById('applyFilters');
    const clearBtn = document.getElementById('clearFilters');
    
    applyBtn.addEventListener('click', performSearch);
    
    clearBtn.addEventListener('click', clearFilters);
}

/**
 * Clear all filters
 */
function clearFilters() {
    document.getElementById('setFilter').value = '';
    document.getElementById('typeFilter').value = '';
    document.getElementById('rarityFilter').value = '';
    document.getElementById('priceMin').value = '';
    document.getElementById('priceMax').value = '';
    document.getElementById('roiMin').value = '';
    document.getElementById('roiMax').value = '';
    document.getElementById('sortBy').value = 'price-desc';
    
    // Clear search results
    const existingResults = document.querySelector('.search-results');
    if (existingResults) {
        existingResults.remove();
    }
}

/**
 * Set up modal functionality
 */
function setupModal() {
    const modal = document.getElementById('cardDetailModal');
    const closeBtn = document.getElementById('closeModal');
    
    closeBtn.addEventListener('click', closeModal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });
}

/**
 * Show card detail modal
 * @param {string} cardId - Card ID
 */
function showCardDetail(cardId) {
    const card = AppState.mockData.cards.find(c => c.id === cardId);
    if (!card) return;
    
    const modal = document.getElementById('cardDetailModal');
    const modalBody = document.getElementById('modalBody');
    const modalCardName = document.getElementById('modalCardName');
    
    modalCardName.textContent = card.name;
    
    // Create detailed card view
    modalBody.innerHTML = createCardDetailHTML(card);
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

/**
 * Create detailed card HTML
 * @param {Object} card - Card data
 * @returns {string} HTML string
 */
function createCardDetailHTML(card) {
    const gradingCosts = calculateGradingCosts(card.psa10Price);
    
    return `
        <div class="card-detail">
            <div class="card-detail-header">
                <div class="card-detail-image">
                    ${card.image ? `<img src="${card.image}" alt="${card.name}">` : '<div class="placeholder-image">🃏</div>'}
                </div>
                <div class="card-detail-info">
                    <h4>${card.name}</h4>
                    <p><strong>Set:</strong> ${card.set}</p>
                    <p><strong>Number:</strong> #${card.number}</p>
                    <p><strong>Rarity:</strong> ${card.rarity}</p>
                    <p><strong>Type:</strong> ${card.type}</p>
                    <p><strong>Release Date:</strong> ${card.releaseDate}</p>
                    ${card.artist ? `<p><strong>Artist:</strong> ${card.artist}</p>` : ''}
                </div>
            </div>
            
            <div class="pricing-dashboard">
                <h3>Pricing Data</h3>
                <div class="price-comparison">
                    <div class="price-item">
                        <span class="price-label">Ungraded:</span>
                        <span class="price-value">$${card.ungradedPrice.toFixed(2)}</span>
                    </div>
                    <div class="price-item">
                        <span class="price-label">PSA 10:</span>
                        <span class="price-value">$${card.psa10Price.toFixed(2)}</span>
                    </div>
                    <div class="price-item">
                        <span class="price-label">PSA 9:</span>
                        <span class="price-value">$${card.psa9Price.toFixed(2)}</span>
                    </div>
                    <div class="price-item">
                        <span class="price-label">PSA 8:</span>
                        <span class="price-value">$${card.psa8Price.toFixed(2)}</span>
                    </div>
                </div>
            </div>
            
            <div class="profitability-analysis">
                <h3>Profitability Analysis</h3>
                <div class="roi-calculator">
                    <div class="calculation-item">
                        <span class="calc-label">Purchase Price:</span>
                        <span class="calc-value">$${card.ungradedPrice.toFixed(2)}</span>
                    </div>
                    <div class="calculation-item">
                        <span class="calc-label">Grading Cost (PSA):</span>
                        <span class="calc-value">$${gradingCosts.psa.toFixed(2)}</span>
                    </div>
                    <div class="calculation-item">
                        <span class="calc-label">Expected PSA 10 Value:</span>
                        <span class="calc-value">$${card.psa10Price.toFixed(2)}</span>
                    </div>
                    <div class="calculation-item total">
                        <span class="calc-label">Net Profit:</span>
                        <span class="calc-value">$${(card.psa10Price - card.ungradedPrice - gradingCosts.psa).toFixed(2)}</span>
                    </div>
                    <div class="calculation-item total">
                        <span class="calc-label">ROI:</span>
                        <span class="calc-value">${card.roi.toFixed(1)}%</span>
                    </div>
                </div>
            </div>
            
            <div class="card-actions">
                <button class="btn-primary" onclick="addToPortfolio('${card.id}')">Add to Portfolio</button>
                <button class="btn-secondary" onclick="addToWatchlist('${card.id}')">Add to Watchlist</button>
            </div>
        </div>
    `;
}

/**
 * Calculate grading costs based on card value
 * @param {number} cardValue - Card value
 * @returns {Object} Grading costs
 */
function calculateGradingCosts(cardValue) {
    let psaCost;
    
    if (cardValue < 199) psaCost = 19;
    else if (cardValue < 499) psaCost = 30;
    else if (cardValue < 999) psaCost = 50;
    else if (cardValue < 2499) psaCost = 75;
    else if (cardValue < 4999) psaCost = 150;
    else if (cardValue < 9999) psaCost = 300;
    else psaCost = 600;
    
    return {
        psa: psaCost,
        gamestop: 19.99
    };
}

/**
 * Close modal
 */
function closeModal() {
    const modal = document.getElementById('cardDetailModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

/**
 * Set up case cracker functionality
 */
function setupCaseCracker() {
    const calculateBtn = document.getElementById('calculateEV');
    calculateBtn.addEventListener('click', calculateExpectedValue);
}

/**
 * Calculate expected value for selected product
 */
function calculateExpectedValue() {
    const product = document.getElementById('productSelect').value;
    const purchasePrice = parseFloat(document.getElementById('purchasePrice').value);
    
    if (!product || !purchasePrice) {
        alert('Please select a product and enter a purchase price.');
        return;
    }
    
    // Simulate expected value calculation
    const evData = calculateProductEV(product, purchasePrice);
    displayEVResults(evData);
}

/**
 * Calculate expected value for a product
 * @param {string} product - Product ID
 * @param {number} purchasePrice - Purchase price
 * @returns {Object} EV calculation results
 */
function calculateProductEV(product, purchasePrice) {
    // Mock EV calculations based on product
    const evData = {
        product: product,
        purchasePrice: purchasePrice,
        expectedValue: 0,
        breakEven: false,
        profitLoss: 0,
        pulls: []
    };
    
    switch(product) {
        case 'base-set-box':
            evData.expectedValue = purchasePrice * 1.2; // 20% profit
            evData.breakEven = evData.expectedValue >= purchasePrice;
            evData.profitLoss = evData.expectedValue - purchasePrice;
            evData.pulls = [
                { name: 'Charizard (Holo)', probability: 0.1, value: 5000 },
                { name: 'Blastoise (Holo)', probability: 0.1, value: 800 },
                { name: 'Venusaur (Holo)', probability: 0.1, value: 600 }
            ];
            break;
        case 'jungle-box':
            evData.expectedValue = purchasePrice * 0.9; // 10% loss
            evData.breakEven = evData.expectedValue >= purchasePrice;
            evData.profitLoss = evData.expectedValue - purchasePrice;
            break;
        // Add more cases as needed
    }
    
    return evData;
}

/**
 * Display expected value results
 * @param {Object} evData - EV calculation data
 */
function displayEVResults(evData) {
    const resultsPanel = document.getElementById('evResults');
    
    const profitClass = evData.profitLoss > 0 ? 'text-success' : 'text-error';
    
    resultsPanel.innerHTML = `
        <div class="results-header">
            <h3>Expected Value Analysis</h3>
        </div>
        <div class="results-content">
            <div class="ev-summary">
                <div class="ev-item">
                    <span class="ev-label">Purchase Price:</span>
                    <span class="ev-value">$${evData.purchasePrice.toFixed(2)}</span>
                </div>
                <div class="ev-item">
                    <span class="ev-label">Expected Value:</span>
                    <span class="ev-value">$${evData.expectedValue.toFixed(2)}</span>
                </div>
                <div class="ev-item ${profitClass}">
                    <span class="ev-label">Profit/Loss:</span>
                    <span class="ev-value">$${evData.profitLoss.toFixed(2)}</span>
                </div>
                <div class="ev-item">
                    <span class="ev-label">Break Even:</span>
                    <span class="ev-value">${evData.breakEven ? '✅ Yes' : '❌ No'}</span>
                </div>
            </div>
            
            ${evData.pulls.length > 0 ? `
                <div class="key-pulls">
                    <h4>Key Potential Pulls</h4>
                    <div class="pulls-list">
                        ${evData.pulls.map(pull => `
                            <div class="pull-item">
                                <span class="pull-name">${pull.name}</span>
                                <span class="pull-probability">${(pull.probability * 100).toFixed(1)}%</span>
                                <span class="pull-value">$${pull.value.toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Set up profile tabs
 */
function setupProfileTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Update active tab button
            tabBtns.forEach(tabBtn => tabBtn.classList.remove('active'));
            this.classList.add('active');
            
            // Show target tab panel
            tabPanels.forEach(panel => panel.classList.remove('active'));
            document.getElementById(targetTab + '-tab').classList.add('active');
        });
    });
}

/**
 * Load initial data from database or API
 */
async function loadInitialData() {
    console.log('📊 Loading initial data...');
    
    try {
        // Check if we have data in the database
        const { data: existingCards, error: cardsError } = await window.SupabaseConfig.DatabaseHelpers.getCards({ limit: 10 });
        
        if (cardsError) {
            console.error('Error checking existing cards:', cardsError);
            throw cardsError;
        }
        
        if (existingCards && existingCards.length > 0) {
            console.log('✅ Found existing data in database');
            await loadDataFromDatabase();
        } else {
            console.log('🔄 No data found, syncing from APIs...');
            await syncInitialData();
        }
        
    } catch (error) {
        console.error('Error loading initial data:', error);
        // Fallback to mock data
        loadMockData();
    }
}

/**
 * Load data from Supabase database
 */
async function loadDataFromDatabase() {
    try {
        // Load cards with pricing
        const { data: cards, error: cardsError } = await window.SupabaseConfig.DatabaseHelpers.getCards({ 
            limit: 50,
            sortBy: 'trending'
        });
        
        if (cardsError) throw cardsError;
        
        // Load sets
        const { data: sets, error: setsError } = await window.SupabaseConfig.DatabaseHelpers.getSets();
        
        if (setsError) throw setsError;
        
        // Transform data to match expected format
        AppState.mockData = {
            cards: cards.map(card => ({
                id: card.id,
                name: card.name,
                set: card.set_name,
                setId: card.set_id,
                number: card.number,
                rarity: card.rarity,
                type: card.card_type,
                ungradedPrice: card.pricing_data?.[0]?.ungraded_price || 0,
                psa10Price: card.pricing_data?.[0]?.psa_10_price || 0,
                psa9Price: card.pricing_data?.[0]?.psa_9_price || 0,
                psa8Price: card.pricing_data?.[0]?.psa_8_price || 0,
                psa7Price: card.pricing_data?.[0]?.psa_7_price || 0,
                roi: card.pricing_data?.[0]?.roi_percentage || 0,
                trending: card.pricing_data?.[0]?.trending_score || 0,
                releaseDate: card.release_date,
                artist: card.artist,
                image: card.image_url
            })),
            sets: sets.map(set => ({
                id: set.pokemon_set_id,
                name: set.name,
                roi: 0, // Calculate this from cards
                totalCards: set.total_cards,
                image: '🏆'
            })),
            stats: await calculateStats(cards)
        };
        
        console.log('✅ Database data loaded successfully!');
        
    } catch (error) {
        console.error('Error loading from database:', error);
        throw error;
    }
}

/**
 * Sync initial data from APIs
 */
async function syncInitialData() {
    try {
        showLoading(true);
        
        // Sync Pokemon sets first
        await window.APIServices.DataSyncService.syncPokemonSets();
        
        // Sync some popular sets (Base Set, Jungle, Fossil)
        const popularSets = ['base1', 'base2', 'base3'];
        
        for (const setId of popularSets) {
            await window.APIServices.DataSyncService.syncCardsFromSet(setId, 20);
        }
        
        // Load the synced data
        await loadDataFromDatabase();
        
        showLoading(false);
        
    } catch (error) {
        console.error('Error syncing initial data:', error);
        showLoading(false);
        throw error;
    }
}

/**
 * Calculate statistics from cards data
 */
async function calculateStats(cards) {
    try {
        const cardsWithPricing = cards.filter(card => card.pricing_data?.[0]);
        
        if (cardsWithPricing.length === 0) {
            return {
                totalCards: cards.length,
                avgROI: 0,
                avgProfit: 0,
                totalMarketValue: 0
            };
        }
        
        const totalCards = cards.length;
        const totalROI = cardsWithPricing.reduce((sum, card) => sum + (card.pricing_data[0].roi_percentage || 0), 0);
        const avgROI = totalROI / cardsWithPricing.length;
        
        const totalProfit = cardsWithPricing.reduce((sum, card) => {
            const pricing = card.pricing_data[0];
            const profit = (pricing.psa_10_price || 0) - (pricing.ungraded_price || 0);
            return sum + profit;
        }, 0);
        const avgProfit = totalProfit / cardsWithPricing.length;
        
        const totalMarketValue = cardsWithPricing.reduce((sum, card) => 
            sum + (card.pricing_data[0].psa_10_price || 0), 0
        );
        
        return {
            totalCards,
            avgROI: parseFloat(avgROI.toFixed(1)),
            avgProfit: parseFloat(avgProfit.toFixed(2)),
            totalMarketValue: Math.round(totalMarketValue)
        };
        
    } catch (error) {
        console.error('Error calculating stats:', error);
        return {
            totalCards: 0,
            avgROI: 0,
            avgProfit: 0,
            totalMarketValue: 0
        };
    }
}

/**
 * Set up authentication
 */
function setupAuthentication() {
    const signInBtn = document.querySelector('.btn-secondary');
    const getPremiumBtn = document.querySelector('.btn-primary');
    
    if (signInBtn && signInBtn.textContent.includes('Sign In')) {
        signInBtn.addEventListener('click', showAuthModal);
    }
    
    if (getPremiumBtn && getPremiumBtn.textContent.includes('Get Premium')) {
        getPremiumBtn.addEventListener('click', showAuthModal);
    }
    
    // Listen for auth state changes
    try {
        const client = window.SupabaseConfig?.getSupabaseClient();
        if (client) {
            client.auth.onAuthStateChange((event, session) => {
                if (event === 'SIGNED_IN') {
                    AppState.currentUser = session.user;
                    updateAuthUI(true);
                } else if (event === 'SIGNED_OUT') {
                    AppState.currentUser = null;
                    updateAuthUI(false);
                }
            });
        }
    } catch (error) {
        console.warn('Auth state listener setup failed:', error);
    }
}

/**
 * Show authentication modal
 */
function showAuthModal() {
    // Create a simple auth modal
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h3>Sign In to TCG Investor Pro</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="auth-tabs">
                    <button class="tab-btn active" data-tab="signin">Sign In</button>
                    <button class="tab-btn" data-tab="signup">Sign Up</button>
                </div>
                <div id="signin-tab" class="tab-panel active">
                    <form id="signinForm">
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" id="signinEmail" required>
                        </div>
                        <div class="form-group">
                            <label>Password</label>
                            <input type="password" id="signinPassword" required>
                        </div>
                        <button type="submit" class="btn-primary" style="width: 100%;">Sign In</button>
                    </form>
                </div>
                <div id="signup-tab" class="tab-panel">
                    <form id="signupForm">
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" id="signupEmail" required>
                        </div>
                        <div class="form-group">
                            <label>Password</label>
                            <input type="password" id="signupPassword" required minlength="6">
                        </div>
                        <button type="submit" class="btn-primary" style="width: 100%;">Sign Up</button>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Set up tab switching
    modal.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Update active tab
            modal.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            modal.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            
            this.classList.add('active');
            modal.querySelector(`#${targetTab}-tab`).classList.add('active');
        });
    });
    
    // Set up form submissions
    modal.querySelector('#signinForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = modal.querySelector('#signinEmail').value;
        const password = modal.querySelector('#signinPassword').value;
        
        try {
            if (window.SupabaseConfig?.DatabaseHelpers) {
                const { error } = await window.SupabaseConfig.DatabaseHelpers.signIn(email, password);
                if (error) throw error;
                
                modal.remove();
                showNotification('Successfully signed in!', 'success');
            } else {
                // Fallback for demo mode
                modal.remove();
                AppState.currentUser = { id: 'demo-user', email: email };
                updateAuthUI(true);
                showNotification('Demo mode: Signed in successfully!', 'success');
            }
        } catch (error) {
            showNotification('Sign in failed: ' + error.message, 'error');
        }
    });
    
    modal.querySelector('#signupForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = modal.querySelector('#signupEmail').value;
        const password = modal.querySelector('#signupPassword').value;
        
        try {
            if (window.SupabaseConfig?.DatabaseHelpers) {
                const { error } = await window.SupabaseConfig.DatabaseHelpers.signUp(email, password);
                if (error) throw error;
                
                modal.remove();
                showNotification('Account created! Please check your email to confirm.', 'success');
            } else {
                // Fallback for demo mode
                modal.remove();
                AppState.currentUser = { id: 'demo-user', email: email };
                updateAuthUI(true);
                showNotification('Demo mode: Account created successfully!', 'success');
            }
        } catch (error) {
            showNotification('Sign up failed: ' + error.message, 'error');
        }
    });
}

/**
 * Show notification message
 */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    
    // Set background color based on type
    if (type === 'success') {
        notification.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    } else if (type === 'error') {
        notification.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
    } else {
        notification.style.background = 'linear-gradient(135deg, #6366f1, #8b5cf6)';
    }
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}

/**
 * Update authentication UI
 */
function updateAuthUI(isSignedIn) {
    const signInBtn = document.querySelector('.btn-secondary');
    const getPremiumBtn = document.querySelector('.btn-primary');
    
    if (isSignedIn) {
        if (signInBtn) {
            signInBtn.textContent = 'Profile';
            signInBtn.onclick = () => {
                document.querySelector('[data-section="profile"]').click();
            };
        }
        if (getPremiumBtn) {
            getPremiumBtn.textContent = 'Portfolio';
            getPremiumBtn.onclick = () => {
                document.querySelector('[data-section="portfolio"]').click();
            };
        }
        
        // Initialize portfolio if not already loaded
        if (window.portfolioManager && !window.portfolioManager.PortfolioState?.isLoaded) {
            window.portfolioManager.initializePortfolio();
        }
    } else {
        if (signInBtn) {
            signInBtn.textContent = 'Sign In';
            signInBtn.onclick = showAuthModal;
        }
        if (getPremiumBtn) {
            getPremiumBtn.textContent = 'Get Premium';
            getPremiumBtn.onclick = showAuthModal;
        }
    }
}

/**
 * Load mock data for the application (fallback)
 */
function loadMockData() {
    console.log('📊 Loading mock data...');
    
    AppState.mockData = {
        cards: [
            {
                id: 'charizard-base-4',
                name: 'Charizard',
                set: 'Base Set',
                setId: 'base-set',
                number: '4',
                rarity: 'rare-holo',
                type: 'pokemon',
                ungradedPrice: 150,
                psa10Price: 5000,
                psa9Price: 800,
                psa8Price: 400,
                psa7Price: 200,
                roi: 3133.3,
                trending: 95,
                releaseDate: '1999-10-20',
                artist: 'Mitsuhiro Arita',
                image: null
            },
            {
                id: 'blastoise-base-2',
                name: 'Blastoise',
                set: 'Base Set',
                setId: 'base-set',
                number: '2',
                rarity: 'rare-holo',
                type: 'pokemon',
                ungradedPrice: 80,
                psa10Price: 800,
                psa9Price: 200,
                psa8Price: 120,
                psa7Price: 80,
                roi: 900,
                trending: 85,
                releaseDate: '1999-10-20',
                artist: 'Mitsuhiro Arita',
                image: null
            },
            {
                id: 'venusaur-base-15',
                name: 'Venusaur',
                set: 'Base Set',
                setId: 'base-set',
                number: '15',
                rarity: 'rare-holo',
                type: 'pokemon',
                ungradedPrice: 60,
                psa10Price: 600,
                psa9Price: 150,
                psa8Price: 90,
                psa7Price: 60,
                roi: 900,
                trending: 75,
                releaseDate: '1999-10-20',
                artist: 'Mitsuhiro Arita',
                image: null
            },
            {
                id: 'pikachu-base-58',
                name: 'Pikachu',
                set: 'Base Set',
                setId: 'base-set',
                number: '58',
                rarity: 'common',
                type: 'pokemon',
                ungradedPrice: 5,
                psa10Price: 50,
                psa9Price: 15,
                psa8Price: 8,
                psa7Price: 4,
                roi: 900,
                trending: 60,
                releaseDate: '1999-10-20',
                artist: 'Atsuko Nishida',
                image: null
            }
        ],
        sets: [
            {
                id: 'base-set',
                name: 'Base Set',
                roi: 1250,
                totalCards: 102,
                image: '🏆'
            },
            {
                id: 'jungle',
                name: 'Jungle',
                roi: 800,
                totalCards: 64,
                image: '🌿'
            },
            {
                id: 'fossil',
                name: 'Fossil',
                roi: 650,
                totalCards: 62,
                image: '🦴'
            }
        ],
        stats: {
            totalCards: 1247,
            avgROI: 425.7,
            avgProfit: 89.50,
            totalMarketValue: 2847392
        }
    };
    
    console.log('✅ Mock data loaded successfully!');
}

/**
 * Render the dashboard with mock data
 */
function renderDashboard() {
    console.log('🎯 Rendering dashboard...');
    
    // Update statistics
    updateStatistics();
    
    // Render top performing sets
    renderTopSets();
    
    // Render featured cards
    renderFeaturedCards();
    
    // Render market trends chart
    renderTrendChart();
    
    console.log('✅ Dashboard rendered successfully!');
}

/**
 * Update statistics in the stats bar
 */
function updateStatistics() {
    const stats = AppState.mockData.stats;
    
    document.getElementById('totalCards').textContent = stats.totalCards.toLocaleString();
    document.getElementById('avgROI').textContent = stats.avgROI.toFixed(1) + '%';
    document.getElementById('avgProfit').textContent = '$' + stats.avgProfit.toFixed(2);
    document.getElementById('totalMarketValue').textContent = '$' + (stats.totalMarketValue / 1000000).toFixed(1) + 'M';
}

/**
 * Render top performing sets
 */
function renderTopSets() {
    const setsGrid = document.getElementById('topSetsGrid');
    const sets = AppState.mockData.sets;
    
    setsGrid.innerHTML = sets.map(set => `
        <div class="set-card" onclick="showSetDetail('${set.id}')">
            <div class="set-image">${set.image}</div>
            <div class="set-name">${set.name}</div>
            <div class="set-roi">+${set.roi}% ROI</div>
        </div>
    `).join('');
}

/**
 * Render featured cards
 */
function renderFeaturedCards() {
    const featuredGrid = document.getElementById('featuredCardsGrid');
    const featuredCards = AppState.mockData.cards.slice(0, 6); // Show first 6 cards
    
    featuredGrid.innerHTML = featuredCards.map(card => createCardHTML(card)).join('');
}

/**
 * Render market trends chart (mock implementation)
 */
function renderTrendChart() {
    const canvas = document.getElementById('trendChart');
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Simple mock chart
    ctx.strokeStyle = '#6366F1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const dataPoints = [50, 55, 52, 58, 60, 65, 62, 68, 70, 72];
    const stepX = canvas.width / (dataPoints.length - 1);
    const maxValue = Math.max(...dataPoints);
    const minValue = Math.min(...dataPoints);
    const range = maxValue - minValue;
    
    dataPoints.forEach((value, index) => {
        const x = index * stepX;
        const y = canvas.height - ((value - minValue) / range) * (canvas.height - 40) - 20;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.stroke();
    
    // Add labels
    ctx.fillStyle = '#6B7280';
    ctx.font = '12px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Market Index', canvas.width / 2, canvas.height - 5);
}

/**
 * Render portfolio section
 */
function renderPortfolio() {
    console.log('📈 Rendering portfolio...');
    
    const portfolio = AppState.portfolio;
    const tableBody = document.querySelector('#portfolioTable tbody');
    
    if (portfolio.length === 0) {
        tableBody.innerHTML = `
            <tr class="empty-state">
                <td colspan="6">No cards in portfolio yet. Add some cards to start tracking!</td>
            </tr>
        `;
    } else {
        tableBody.innerHTML = portfolio.map(card => `
            <tr>
                <td>${card.name}</td>
                <td>$${card.purchasePrice.toFixed(2)}</td>
                <td>$${card.currentValue.toFixed(2)}</td>
                <td class="${card.roi > 0 ? 'text-success' : 'text-error'}">${card.roi.toFixed(1)}%</td>
                <td class="${card.profit > 0 ? 'text-success' : 'text-error'}">$${card.profit.toFixed(2)}</td>
                <td>
                    <button class="btn-outline" onclick="removeFromPortfolio('${card.id}')">Remove</button>
                </td>
            </tr>
        `).join('');
    }
}

/**
 * Render watchlist section
 */
function renderWatchlist() {
    console.log('👀 Rendering watchlist...');
    
    const watchlist = AppState.watchlist;
    const watchlistGrid = document.getElementById('watchlistGrid');
    
    if (watchlist.length === 0) {
        watchlistGrid.innerHTML = `
            <div class="empty-state">
                <p>No cards in watchlist yet. Add some cards to start monitoring!</p>
            </div>
        `;
    } else {
        watchlistGrid.innerHTML = watchlist.map(card => createCardHTML(card)).join('');
    }
}

/**
 * Render case cracker section
 */
function renderCaseCracker() {
    console.log('🎲 Rendering case cracker...');
    // Case cracker is already set up in setupCaseCracker()
}

/**
 * Render profile section
 */
function renderProfile() {
    console.log('👤 Rendering profile...');
    // Profile is already set up in setupProfileTabs()
}

/**
 * Add card to portfolio
 * @param {string} cardId - Card ID
 */
function addToPortfolio(cardId) {
    const card = AppState.mockData.cards.find(c => c.id === cardId);
    if (!card) return;
    
    // Check if already in portfolio
    if (AppState.portfolio.find(c => c.id === cardId)) {
        alert('This card is already in your portfolio.');
        return;
    }
    
    // Add to portfolio with current data
    const portfolioCard = {
        ...card,
        purchasePrice: card.ungradedPrice,
        currentValue: card.psa10Price,
        profit: card.psa10Price - card.ungradedPrice - calculateGradingCosts(card.psa10Price).psa,
        roi: card.roi,
        addedDate: new Date().toISOString()
    };
    
    AppState.portfolio.push(portfolioCard);
    
    // Show success message
    showNotification('Card added to portfolio!', 'success');
    
    // Close modal if open
    closeModal();
    
    // Re-render portfolio if currently viewing
    if (AppState.currentSection === 'portfolio') {
        renderPortfolio();
    }
}

/**
 * Add card to watchlist
 * @param {string} cardId - Card ID
 */
function addToWatchlist(cardId) {
    const card = AppState.mockData.cards.find(c => c.id === cardId);
    if (!card) return;
    
    // Check if already in watchlist
    if (AppState.watchlist.find(c => c.id === cardId)) {
        alert('This card is already in your watchlist.');
        return;
    }
    
    AppState.watchlist.push(card);
    
    // Show success message
    showNotification('Card added to watchlist!', 'success');
    
    // Close modal if open
    closeModal();
    
    // Re-render watchlist if currently viewing
    if (AppState.currentSection === 'watchlist') {
        renderWatchlist();
    }
}

/**
 * Remove card from portfolio
 * @param {string} cardId - Card ID
 */
function removeFromPortfolio(cardId) {
    AppState.portfolio = AppState.portfolio.filter(c => c.id !== cardId);
    showNotification('Card removed from portfolio.', 'info');
    renderPortfolio();
}

/**
 * Show notification to user
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, info, warning)
 */
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--bg-primary);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-lg);
        padding: var(--spacing-md);
        box-shadow: var(--shadow-lg);
        z-index: 3000;
        max-width: 400px;
        animation: slideInRight 0.3s ease-out;
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

/**
 * Show/hide loading overlay
 * @param {boolean} show - Whether to show loading
 */
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.add('active');
    } else {
        overlay.classList.remove('active');
    }
}


/**
 * Show set detail (placeholder function)
 * @param {string} setId - Set ID
 */
function showSetDetail(setId) {
    const set = AppState.mockData.sets.find(s => s.id === setId);
    if (!set) return;
    
    // For now, just show an alert
    alert(`Set Details for ${set.name}\nROI: +${set.roi}%\nTotal Cards: ${set.totalCards}`);
}

// Export functions for global access
window.showCardDetail = showCardDetail;
window.addToPortfolio = addToPortfolio;
window.addToWatchlist = addToWatchlist;
window.removeFromPortfolio = removeFromPortfolio;
window.showSetDetail = showSetDetail;

console.log('🎉 TCG Investor Pro script loaded successfully!');
