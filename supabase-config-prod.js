// TCG Investor Pro - Production Supabase Configuration
// This version uses environment variables for security

// Supabase configuration with environment variable fallbacks
const SUPABASE_CONFIG = {
    url: (window.SUPABASE_URL && window.SUPABASE_URL !== '%%SUPABASE_URL%%') ? window.SUPABASE_URL : 'https://vckwqetuufrcsyuxrxzy.supabase.co',
    anonKey: (window.SUPABASE_ANON_KEY && window.SUPABASE_ANON_KEY !== '%%SUPABASE_ANON_KEY%%') ? window.SUPABASE_ANON_KEY : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZja3dxZXR1dWZyY3N5dXhyeHp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4ODI3NTUsImV4cCI6MjA3MzQ1ODc1NX0.s-tS9aZtY4tK1x8fznr4nyrX3AI7dTCewALSI7-3cvU'
};

// Initialize Supabase client
let supabase = null;

/**
 * Initialize Supabase client with environment variables
 */
function initializeSupabase(url, anonKey) {
    try {
        // Check if Supabase is already loaded
        if (typeof window.supabase === 'undefined') {
            console.warn('Supabase client library not loaded. Please include the Supabase script in your HTML.');
            return null;
        }

        // Validate configuration
        if (!url || url === 'YOUR_SUPABASE_URL' || url === '%%SUPABASE_URL%%') {
            console.warn('Supabase URL not configured. Please set SUPABASE_URL environment variable.');
            return null;
        }
        
        if (!anonKey || anonKey === 'YOUR_SUPABASE_ANON_KEY' || anonKey === '%%SUPABASE_ANON_KEY%%') {
            console.warn('Supabase anon key not configured. Please set SUPABASE_ANON_KEY environment variable.');
            return null;
        }

        // Initialize the client
        supabase = window.supabase.createClient(url, anonKey);
        
        // Test the connection
        testSupabaseConnection();
        
        return supabase;
    } catch (error) {
        console.error('Error initializing Supabase:', error);
        return null;
    }
}

/**
 * Test Supabase connection
 */
async function testSupabaseConnection() {
    try {
        const { data, error } = await supabase
            .from('sets')
            .select('count')
            .limit(1);
            
        if (error) {
            console.error('Supabase connection test failed:', error);
            return false;
        }
        
        console.log('✅ Supabase connection successful!');
        return true;
    } catch (err) {
        console.error('Supabase connection test error:', err);
        return false;
    }
}

/**
 * Get Supabase client instance
 */
function getSupabaseClient() {
    if (!supabase) {
        console.warn('Supabase not initialized. Attempting to initialize...');
        // Try to initialize with current config
        const client = initializeSupabase(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        if (client) {
            return client;
        }
        console.warn('Supabase initialization failed. Using demo mode.');
        return null;
    }
    return supabase;
}

/**
 * Database helper functions (same as before but with better error handling)
 */
const DatabaseHelpers = {
    
    // Cards operations
    async getCards(filters = {}) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Client not initialized' };
        
        try {
            let query = client.from('cards').select(`
                *,
                pricing_data(*),
                sets(name, series)
            `);
            
            // Apply filters
            if (filters.setId) {
                query = query.eq('set_id', filters.setId);
            }
            if (filters.cardType) {
                query = query.eq('card_type', filters.cardType);
            }
            if (filters.rarity) {
                query = query.eq('rarity', filters.rarity);
            }
            if (filters.searchTerm) {
                query = query.ilike('name', `%${filters.searchTerm}%`);
            }
            
            // Apply sorting
            if (filters.sortBy) {
                switch (filters.sortBy) {
                    case 'price-desc':
                        query = query.order('pricing_data.ungraded_price', { ascending: false });
                        break;
                    case 'price-asc':
                        query = query.order('pricing_data.ungraded_price', { ascending: true });
                        break;
                    case 'roi-desc':
                        query = query.order('pricing_data.roi_percentage', { ascending: false });
                        break;
                    case 'name':
                        query = query.order('name', { ascending: true });
                        break;
                    case 'trending':
                        query = query.order('pricing_data.trending_score', { ascending: false });
                        break;
                }
            }
            
            // Apply pagination
            if (filters.limit) {
                query = query.limit(filters.limit);
            }
            if (filters.offset) {
                query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
            }
            
            return await query;
        } catch (error) {
            console.error('Error fetching cards:', error);
            return { data: null, error: error.message };
        }
    },
    
    async getCardById(cardId) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Client not initialized' };
        
        try {
            return await client
                .from('cards')
                .select(`
                    *,
                    pricing_data(*),
                    sets(name, series),
                    price_history(*)
                `)
                .eq('id', cardId)
                .single();
        } catch (error) {
            console.error('Error fetching card by ID:', error);
            return { data: null, error: error.message };
        }
    },
    
    async searchCards(searchTerm, filters = {}) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Client not initialized' };
        
        try {
            let query = client.from('cards').select(`
                *,
                pricing_data(*),
                sets(name, series)
            `);
            
            // Search by name, set, or number
            if (searchTerm) {
                query = query.or(`name.ilike.%${searchTerm}%,set_name.ilike.%${searchTerm}%,number.ilike.%${searchTerm}%`);
            }
            
            // Apply additional filters
            if (filters.setId) query = query.eq('set_id', filters.setId);
            if (filters.cardType) query = query.eq('card_type', filters.cardType);
            if (filters.rarity) query = query.eq('rarity', filters.rarity);
            
            return await query;
        } catch (error) {
            console.error('Error searching cards:', error);
            return { data: null, error: error.message };
        }
    },
    
    // Sets operations
    async getSets() {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Client not initialized' };
        
        try {
            return await client
                .from('sets')
                .select('*')
                .order('release_date', { ascending: false });
        } catch (error) {
            console.error('Error fetching sets:', error);
            return { data: null, error: error.message };
        }
    },
    
    // User portfolio operations
    async getUserPortfolio(userId) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Client not initialized' };
        
        try {
            return await client
                .from('user_portfolios')
                .select(`
                    *,
                    cards (
                        id,
                        name,
                        set_name,
                        number,
                        image_url,
                        pricing_data (
                            ungraded_price,
                            psa_7_price,
                            psa_8_price,
                            psa_9_price,
                            psa_10_price
                        )
                    )
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
        } catch (error) {
            console.error('Error fetching user portfolio:', error);
            return { data: null, error: error.message };
        }
    },
    
    async addToPortfolio(userId, cardId, purchasePrice, purchaseDate, gradingStatus = 'ungraded', notes = '', quantity = 1) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Client not initialized' };
        
        try {
            return await client
                .from('user_portfolios')
                .insert({
                    user_id: userId,
                    card_id: cardId,
                    purchase_price: purchasePrice,
                    purchase_date: purchaseDate,
                    grading_status: gradingStatus,
                    quantity: quantity,
                    notes: notes
                });
        } catch (error) {
            console.error('Error adding to portfolio:', error);
            return { data: null, error: error.message };
        }
    },
    
    async removeFromPortfolio(userId, portfolioId) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Client not initialized' };
        
        try {
            return await client
                .from('user_portfolios')
                .delete()
                .eq('user_id', userId)
                .eq('id', portfolioId);
        } catch (error) {
            console.error('Error removing from portfolio:', error);
            return { data: null, error: error.message };
        }
    },
    
    async updatePortfolioItem(portfolioId, updateData) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Client not initialized' };
        
        try {
            return await client
                .from('user_portfolios')
                .update(updateData)
                .eq('id', portfolioId);
        } catch (error) {
            console.error('Error updating portfolio item:', error);
            return { data: null, error: error.message };
        }
    },
    
    // User watchlist operations
    async getUserWatchlist(userId) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Client not initialized' };
        
        try {
            return await client
                .from('watchlist_with_pricing')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
        } catch (error) {
            console.error('Error fetching user watchlist:', error);
            return { data: null, error: error.message };
        }
    },
    
    async addToWatchlist(userId, cardId, alertPrice = null, alertType = 'price_drop') {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Client not initialized' };
        
        try {
            return await client
                .from('user_watchlists')
                .insert({
                    user_id: userId,
                    card_id: cardId,
                    alert_price: alertPrice,
                    alert_type: alertType
                });
        } catch (error) {
            console.error('Error adding to watchlist:', error);
            return { data: null, error: error.message };
        }
    },
    
    async removeFromWatchlist(userId, cardId) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Client not initialized' };
        
        try {
            return await client
                .from('user_watchlists')
                .delete()
                .eq('user_id', userId)
                .eq('card_id', cardId);
        } catch (error) {
            console.error('Error removing from watchlist:', error);
            return { data: null, error: error.message };
        }
    },
    
    // Authentication helpers
    async signUp(email, password) {
        const client = getSupabaseClient();
        if (!client) {
            console.warn('Supabase not available, using demo mode for sign up');
            return { data: null, error: 'Supabase not available - demo mode' };
        }
        
        try {
            return await client.auth.signUp({
                email: email,
                password: password
            });
        } catch (error) {
            console.error('Error signing up:', error);
            return { data: null, error: error.message };
        }
    },
    
    async signIn(email, password) {
        const client = getSupabaseClient();
        if (!client) {
            console.warn('Supabase not available, using demo mode for sign in');
            return { data: null, error: 'Supabase not available - demo mode' };
        }
        
        try {
            return await client.auth.signInWithPassword({
                email: email,
                password: password
            });
        } catch (error) {
            console.error('Error signing in:', error);
            return { data: null, error: error.message };
        }
    },
    
    async signOut() {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Client not initialized' };
        
        try {
            return await client.auth.signOut();
        } catch (error) {
            console.error('Error signing out:', error);
            return { data: null, error: error.message };
        }
    },
    
    async getCurrentUser() {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Client not initialized' };
        
        try {
            return await client.auth.getUser();
        } catch (error) {
            console.error('Error getting current user:', error);
            return { data: null, error: error.message };
        }
    },
    
    // User preferences
    async getUserPreferences(userId) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Client not initialized' };
        
        try {
            return await client
                .from('user_preferences')
                .select('*')
                .eq('user_id', userId)
                .single();
        } catch (error) {
            console.error('Error fetching user preferences:', error);
            return { data: null, error: error.message };
        }
    },
    
    async updateUserPreferences(userId, preferences) {
        const client = getSupabaseClient();
        if (!client) return { data: null, error: 'Client not initialized' };
        
        try {
            return await client
                .from('user_preferences')
                .upsert({
                    user_id: userId,
                    ...preferences
                });
        } catch (error) {
            console.error('Error updating user preferences:', error);
            return { data: null, error: error.message };
        }
    }
};

// Export for use in other files
window.SupabaseConfig = {
    SUPABASE_CONFIG,
    initializeSupabase,
    getSupabaseClient,
    testSupabaseConnection,
    DatabaseHelpers
};

console.log('📊 Production Supabase configuration loaded');
