// TCG Investor Pro - API Services
// This file handles all external API integrations

// API Services Configuration
const API_SERVICES = {
    pokemontcg: {
        baseUrl: 'https://api.pokemontcg.io/v2',
        timeout: 10000
    },
    pricecharting: {
        baseUrl: 'https://www.pricecharting.com/api',
        timeout: 10000
    },
    pokemonpricetracker: {
        baseUrl: 'https://api.pokemonpricetracker.com',
        timeout: 10000
    }
};

// API Helper Functions
const APIHelpers = {
    
    /**
     * Get API key for a specific service
     */
    async getApiKey(service) {
        try {
            const { data, error } = await window.SupabaseConfig.DatabaseHelpers.getSupabaseClient()
                .from('user_api_keys')
                .select('api_key')
                .eq('service', service)
                .eq('is_active', true)
                .single();
                
            if (error || !data) {
                console.warn(`No API key found for ${service}`);
                return null;
            }
            
            return data.api_key;
        } catch (err) {
            console.error(`Error fetching API key for ${service}:`, err);
            return null;
        }
    },
    
    /**
     * Make API request with error handling
     */
    async makeApiRequest(url, options = {}) {
        try {
            const response = await fetch(url, {
                timeout: options.timeout || 10000,
                ...options
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }
};

// PokemonTCG.io API Integration
const PokemonTCGAPI = {
    
    /**
     * Fetch all Pokemon card sets
     */
    async getSets() {
        try {
            const apiKey = await APIHelpers.getApiKey('pokemontcg');
            const url = `${API_SERVICES.pokemontcg.baseUrl}/sets?page=1&pageSize=100`;
            
            const options = {
                headers: {
                    'Accept': 'application/json'
                }
            };
            
            if (apiKey) {
                options.headers['X-Api-Key'] = apiKey;
            }
            
            const data = await APIHelpers.makeApiRequest(url, options);
            return data.data || [];
        } catch (error) {
            console.error('Error fetching Pokemon sets:', error);
            return [];
        }
    },
    
    /**
     * Fetch cards from a specific set
     */
    async getCardsBySet(setId, page = 1, pageSize = 250) {
        try {
            const apiKey = await APIHelpers.getApiKey('pokemontcg');
            const url = `${API_SERVICES.pokemontcg.baseUrl}/cards?q=set.id:${setId}&page=${page}&pageSize=${pageSize}`;
            
            const options = {
                headers: {
                    'Accept': 'application/json'
                }
            };
            
            if (apiKey) {
                options.headers['X-Api-Key'] = apiKey;
            }
            
            const data = await APIHelpers.makeApiRequest(url, options);
            return data.data || [];
        } catch (error) {
            console.error(`Error fetching cards for set ${setId}:`, error);
            return [];
        }
    },
    
    /**
     * Search for cards by name
     */
    async searchCards(searchTerm, page = 1, pageSize = 50) {
        try {
            const apiKey = await APIHelpers.getApiKey('pokemontcg');
            const url = `${API_SERVICES.pokemontcg.baseUrl}/cards?q=name:"${encodeURIComponent(searchTerm)}"&page=${page}&pageSize=${pageSize}`;
            
            const options = {
                headers: {
                    'Accept': 'application/json'
                }
            };
            
            if (apiKey) {
                options.headers['X-Api-Key'] = apiKey;
            }
            
            const data = await APIHelpers.makeApiRequest(url, options);
            return data.data || [];
        } catch (error) {
            console.error(`Error searching cards for "${searchTerm}":`, error);
            return [];
        }
    },
    
    /**
     * Get all cards (with pagination)
     */
    async getAllCards(page = 1, pageSize = 250) {
        try {
            const apiKey = await APIHelpers.getApiKey('pokemontcg');
            const url = `${API_SERVICES.pokemontcg.baseUrl}/cards?page=${page}&pageSize=${pageSize}`;
            
            const options = {
                headers: {
                    'Accept': 'application/json'
                }
            };
            
            if (apiKey) {
                options.headers['X-Api-Key'] = apiKey;
            }
            
            const data = await APIHelpers.makeApiRequest(url, options);
            return data;
        } catch (error) {
            console.error('Error fetching all cards:', error);
            return { data: [], page: 1, pageSize: 0, count: 0, totalCount: 0 };
        }
    }
};

// PriceCharting API Integration
const PriceChartingAPI = {
    
    /**
     * Get product price by name
     */
    async getProductPrice(productName) {
        try {
            const apiKey = await APIHelpers.getApiKey('pricecharting');
            if (!apiKey) {
                console.warn('No PriceCharting API key available');
                return null;
            }
            
            const url = `${API_SERVICES.pricecharting.baseUrl}/products?t=${encodeURIComponent(productName)}&key=${apiKey}`;
            
            const data = await APIHelpers.makeApiRequest(url);
            return data;
        } catch (error) {
            console.error(`Error fetching price for "${productName}":`, error);
            return null;
        }
    },
    
    /**
     * Search for Pokemon card prices
     */
    async searchPokemonPrices(searchTerm) {
        try {
            const apiKey = await APIHelpers.getApiKey('pricecharting');
            if (!apiKey) {
                console.warn('No PriceCharting API key available');
                return [];
            }
            
            const url = `${API_SERVICES.pricecharting.baseUrl}/products?t=${encodeURIComponent(searchTerm + ' pokemon')}&key=${apiKey}`;
            
            const data = await APIHelpers.makeApiRequest(url);
            return Array.isArray(data) ? data : [data];
        } catch (error) {
            console.error(`Error searching prices for "${searchTerm}":`, error);
            return [];
        }
    }
};

// PokemonPriceTracker API Integration
const PokemonPriceTrackerAPI = {
    
    /**
     * Get card pricing data
     */
    async getCardPricing(cardName, setName = '') {
        try {
            const apiKey = await APIHelpers.getApiKey('pokemonpricetracker');
            if (!apiKey) {
                console.warn('No PokemonPriceTracker API key available');
                return null;
            }
            
            const searchTerm = setName ? `${cardName} ${setName}` : cardName;
            const url = `${API_SERVICES.pokemonpricetracker.baseUrl}/prices?card=${encodeURIComponent(searchTerm)}`;
            
            const options = {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': 'application/json'
                }
            };
            
            const data = await APIHelpers.makeApiRequest(url, options);
            return data;
        } catch (error) {
            console.error(`Error fetching pricing for "${cardName}":`, error);
            return null;
        }
    },
    
    /**
     * Get trending cards
     */
    async getTrendingCards() {
        try {
            const apiKey = await APIHelpers.getApiKey('pokemonpricetracker');
            if (!apiKey) {
                console.warn('No PokemonPriceTracker API key available');
                return [];
            }
            
            const url = `${API_SERVICES.pokemonpricetracker.baseUrl}/trending`;
            
            const options = {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': 'application/json'
                }
            };
            
            const data = await APIHelpers.makeApiRequest(url, options);
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Error fetching trending cards:', error);
            return [];
        }
    }
};

// Data Synchronization Service
const DataSyncService = {
    
    /**
     * Sync Pokemon sets to database
     */
    async syncPokemonSets() {
        try {
            console.log('🔄 Syncing Pokemon sets...');
            const sets = await PokemonTCGAPI.getSets();
            
            if (sets.length === 0) {
                console.log('No sets found to sync');
                return;
            }
            
            const client = window.SupabaseConfig.getSupabaseClient();
            const { data, error } = await client
                .from('sets')
                .upsert(sets.map(set => ({
                    pokemon_set_id: set.id,
                    name: set.name,
                    series: set.series,
                    total_cards: set.total,
                    release_date: set.releaseDate,
                    logo_url: set.images?.logo,
                    symbol_url: set.images?.symbol
                })), { 
                    onConflict: 'pokemon_set_id' 
                });
                
            if (error) {
                console.error('Error syncing sets:', error);
                return;
            }
            
            console.log(`✅ Synced ${sets.length} Pokemon sets`);
            return sets.length;
        } catch (error) {
            console.error('Error in syncPokemonSets:', error);
        }
    },
    
    /**
     * Sync cards from a specific set
     */
    async syncCardsFromSet(setId, limit = 100) {
        try {
            console.log(`🔄 Syncing cards from set ${setId}...`);
            const cards = await PokemonTCGAPI.getCardsBySet(setId, 1, limit);
            
            if (cards.length === 0) {
                console.log(`No cards found for set ${setId}`);
                return;
            }
            
            const client = window.SupabaseConfig.getSupabaseClient();
            
            // First, ensure the set exists
            const { data: setData } = await client
                .from('sets')
                .select('id')
                .eq('pokemon_set_id', setId)
                .single();
                
            if (!setData) {
                console.warn(`Set ${setId} not found in database. Please sync sets first.`);
                return;
            }
            
            // Insert cards
            const { data, error } = await client
                .from('cards')
                .upsert(cards.map(card => ({
                    pokemon_id: card.id,
                    name: card.name,
                    set_name: card.set.name,
                    set_id: setId,
                    number: card.number,
                    rarity: card.rarity || 'Unknown',
                    card_type: card.supertype || 'Unknown',
                    image_url: card.images?.small,
                    image_url_small: card.images?.small,
                    image_url_large: card.images?.large,
                    release_date: card.set.releaseDate,
                    artist: card.artist,
                    card_text: card.flavorText || '',
                    hp: card.hp ? parseInt(card.hp) : null,
                    retreat_cost: card.retreatCost ? parseInt(card.retreatCost) : null,
                    weakness_type: card.weaknesses?.[0]?.type,
                    weakness_value: card.weaknesses?.[0]?.value,
                    resistance_type: card.resistances?.[0]?.type,
                    resistance_value: card.resistances?.[0]?.value,
                    attacks: card.attacks || [],
                    abilities: card.abilities || []
                })), { 
                    onConflict: 'pokemon_id' 
                });
                
            if (error) {
                console.error('Error syncing cards:', error);
                return;
            }
            
            console.log(`✅ Synced ${cards.length} cards from set ${setId}`);
            return cards.length;
        } catch (error) {
            console.error('Error in syncCardsFromSet:', error);
        }
    },
    
    /**
     * Sync pricing data for a card
     */
    async syncCardPricing(cardId, cardName, setName) {
        try {
            console.log(`🔄 Syncing pricing for ${cardName}...`);
            
            // Try multiple pricing sources
            const pricingData = await this.getCardPricingFromMultipleSources(cardName, setName);
            
            if (!pricingData) {
                console.log(`No pricing data found for ${cardName}`);
                return;
            }
            
            const client = window.SupabaseConfig.getSupabaseClient();
            const { data, error } = await client
                .from('pricing_data')
                .upsert({
                    card_id: cardId,
                    ...pricingData,
                    last_updated: new Date().toISOString(),
                    data_source: 'multiple_apis'
                }, { 
                    onConflict: 'card_id' 
                });
                
            if (error) {
                console.error('Error syncing pricing:', error);
                return;
            }
            
            console.log(`✅ Synced pricing for ${cardName}`);
            return pricingData;
        } catch (error) {
            console.error('Error in syncCardPricing:', error);
        }
    },
    
    /**
     * Get pricing from multiple sources and combine
     */
    async getCardPricingFromMultipleSources(cardName, setName) {
        try {
            const [pricechartingData, pokemonpricetrackerData] = await Promise.allSettled([
                PriceChartingAPI.searchPokemonPrices(cardName),
                PokemonPriceTrackerAPI.getCardPricing(cardName, setName)
            ]);
            
            let combinedPricing = {};
            
            // Process PriceCharting data
            if (pricechartingData.status === 'fulfilled' && pricechartingData.value) {
                const pcData = pricechartingData.value.find(item => 
                    item.productName && item.productName.toLowerCase().includes(cardName.toLowerCase())
                );
                
                if (pcData) {
                    combinedPricing = {
                        ...combinedPricing,
                        ungraded_price: this.parsePrice(pcData.price),
                        psa_10_price: this.parsePrice(pcData.psa10Price),
                        psa_9_price: this.parsePrice(pcData.psa9Price),
                        psa_8_price: this.parsePrice(pcData.psa8Price),
                        psa_7_price: this.parsePrice(pcData.psa7Price),
                        data_source: 'pricecharting'
                    };
                }
            }
            
            // Process PokemonPriceTracker data
            if (pokemonpricetrackerData.status === 'fulfilled' && pokemonpricetrackerData.value) {
                const pptData = pokemonpricetrackerData.value;
                
                if (pptData.current_price || pptData.market_price) {
                    combinedPricing = {
                        ...combinedPricing,
                        ungraded_price: combinedPricing.ungraded_price || this.parsePrice(pptData.current_price || pptData.market_price),
                        trending_score: pptData.trending_score || 0,
                        data_source: combinedPricing.data_source ? 'multiple_apis' : 'pokemonpricetracker'
                    };
                }
            }
            
            // Calculate ROI if we have pricing data
            if (combinedPricing.ungraded_price && combinedPricing.psa_10_price) {
                combinedPricing.roi_percentage = this.calculateROI(combinedPricing.ungraded_price, combinedPricing.psa_10_price);
            }
            
            return Object.keys(combinedPricing).length > 0 ? combinedPricing : null;
        } catch (error) {
            console.error('Error getting pricing from multiple sources:', error);
            return null;
        }
    },
    
    /**
     * Parse price string to number
     */
    parsePrice(priceString) {
        if (!priceString) return null;
        
        // Remove currency symbols and commas
        const cleanPrice = priceString.toString().replace(/[$,\s]/g, '');
        const price = parseFloat(cleanPrice);
        
        return isNaN(price) ? null : price;
    },
    
    /**
     * Calculate ROI percentage
     */
    calculateROI(purchasePrice, currentPrice) {
        if (!purchasePrice || !currentPrice || purchasePrice === 0) return 0;
        return ((currentPrice - purchasePrice) / purchasePrice) * 100;
    }
};

// Export API services
window.APIServices = {
    APIHelpers,
    PokemonTCGAPI,
    PriceChartingAPI,
    PokemonPriceTrackerAPI,
    DataSyncService
};

console.log('🚀 API Services loaded successfully');

