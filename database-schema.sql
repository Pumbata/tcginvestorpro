-- TCG Investor Pro Database Schema
-- Run this in your Supabase SQL Editor

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Table: public.user_api_keys
CREATE TABLE IF NOT EXISTS public.user_api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    service TEXT NOT NULL,
    api_key TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, service)
);

-- Table: public.sets
CREATE TABLE IF NOT EXISTS public.sets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    series TEXT,
    total INTEGER,
    release_date DATE,
    legal_standard TEXT DEFAULT 'unknown',
    symbol_url TEXT,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: public.cards
CREATE TABLE IF NOT EXISTS public.cards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    set_id TEXT REFERENCES public.sets(id) ON DELETE CASCADE,
    number TEXT,
    rarity TEXT,
    images JSONB,
    tcgplayer_id TEXT,
    cardmarket_id TEXT,
    legal_standard TEXT DEFAULT 'unknown',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: public.pricing_data
CREATE TABLE IF NOT EXISTS public.pricing_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    card_id TEXT REFERENCES public.cards(id) ON DELETE CASCADE,
    source TEXT NOT NULL,
    ungraded_price DECIMAL(10,2),
    psa_10_price DECIMAL(10,2),
    psa_9_price DECIMAL(10,2),
    psa_8_price DECIMAL(10,2),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (card_id, source)
);

-- Table: public.price_history
CREATE TABLE IF NOT EXISTS public.price_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    card_id TEXT REFERENCES public.cards(id) ON DELETE CASCADE,
    source TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (card_id, source, date)
);

-- Table: public.user_portfolios
CREATE TABLE IF NOT EXISTS public.user_portfolios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    card_id TEXT REFERENCES public.cards(id) ON DELETE CASCADE,
    purchase_price DECIMAL(10,2) NOT NULL,
    purchase_date DATE NOT NULL,
    quantity INTEGER DEFAULT 1,
    grading_status TEXT DEFAULT 'ungraded',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, card_id)
);

-- Table: public.user_watchlists
CREATE TABLE IF NOT EXISTS public.user_watchlists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    card_id TEXT REFERENCES public.cards(id) ON DELETE CASCADE,
    alert_price DECIMAL(10,2),
    alert_type TEXT DEFAULT 'above',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, card_id)
);

-- Table: public.user_preferences
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    currency TEXT DEFAULT 'USD',
    grading_preference TEXT DEFAULT 'PSA',
    notification_email BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own API keys." ON public.user_api_keys
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own portfolios." ON public.user_portfolios
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own watchlists." ON public.user_watchlists
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own preferences." ON public.user_preferences
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cards_set_id ON public.cards(set_id);
CREATE INDEX IF NOT EXISTS idx_cards_name ON public.cards(name);
CREATE INDEX IF NOT EXISTS idx_pricing_data_card_id ON public.pricing_data(card_id);
CREATE INDEX IF NOT EXISTS idx_price_history_card_id ON public.price_history(card_id);
CREATE INDEX IF NOT EXISTS idx_user_portfolios_user_id ON public.user_portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_user_watchlists_user_id ON public.user_watchlists(user_id);

-- Views for easier querying
CREATE OR REPLACE VIEW portfolio_with_roi AS
SELECT 
    up.*,
    c.name as card_name,
    c.images,
    s.name as set_name,
    s.series,
    pd.ungraded_price,
    pd.psa_10_price,
    (pd.ungraded_price - up.purchase_price) * up.quantity as profit_ungraded,
    (pd.psa_10_price - up.purchase_price) * up.quantity as profit_psa_10,
    CASE 
        WHEN up.purchase_price > 0 THEN ((pd.ungraded_price - up.purchase_price) / up.purchase_price) * 100
        ELSE 0
    END as roi_ungraded,
    CASE 
        WHEN up.purchase_price > 0 THEN ((pd.psa_10_price - up.purchase_price) / up.purchase_price) * 100
        ELSE 0
    END as roi_psa_10
FROM public.user_portfolios up
JOIN public.cards c ON up.card_id = c.id
JOIN public.sets s ON c.set_id = s.id
LEFT JOIN public.pricing_data pd ON c.id = pd.card_id AND pd.source = 'pricecharting';

CREATE OR REPLACE VIEW watchlist_with_pricing AS
SELECT 
    uw.*,
    c.name as card_name,
    c.images,
    s.name as set_name,
    s.series,
    pd.ungraded_price,
    pd.psa_10_price,
    CASE 
        WHEN uw.alert_type = 'above' AND pd.ungraded_price >= uw.alert_price THEN TRUE
        WHEN uw.alert_type = 'below' AND pd.ungraded_price <= uw.alert_price THEN TRUE
        ELSE FALSE
    END as alert_triggered
FROM public.user_watchlists uw
JOIN public.cards c ON uw.card_id = c.id
JOIN public.sets s ON c.set_id = s.id
LEFT JOIN public.pricing_data pd ON c.id = pd.card_id AND pd.source = 'pricecharting';
