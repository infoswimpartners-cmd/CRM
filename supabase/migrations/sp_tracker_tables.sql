-- =========================================================
-- SP-Tracker（スイムパートナーズ専用 SEO・GEO統合管理）マイグレーション
-- 文書バージョン: 1.0.0
-- =========================================================

-- 1. キーワードマスタ
CREATE TABLE IF NOT EXISTS public.keywords (
    id SERIAL PRIMARY KEY,
    keyword VARCHAR(255) NOT NULL UNIQUE,
    area_category VARCHAR(50),      -- 'tokyo_23', 'kanagawa', 'chiba'
    target_category VARCHAR(50),    -- 'adult', 'junior', 'triathlon', 'phobia'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. SEO順位推移ログ
CREATE TABLE IF NOT EXISTS public.seo_rankings (
    id BIGSERIAL PRIMARY KEY,
    keyword_id INTEGER REFERENCES public.keywords(id) ON DELETE CASCADE,
    rank_date DATE NOT NULL,
    rank_position INTEGER,          -- 101以上は圏外
    target_url TEXT,
    competitor_top_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_keyword_date UNIQUE (keyword_id, rank_date)
);

-- 3. GEOプロンプトマスタ
CREATE TABLE IF NOT EXISTS public.geo_prompts (
    id SERIAL PRIMARY KEY,
    prompt_text TEXT NOT NULL UNIQUE,
    intent_category VARCHAR(50),    -- 'adult', 'junior', 'comparison', 'phobia'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. GEO実行結果ログ
CREATE TABLE IF NOT EXISTS public.geo_results (
    id BIGSERIAL PRIMARY KEY,
    prompt_id INTEGER REFERENCES public.geo_prompts(id) ON DELETE CASCADE,
    check_date DATE NOT NULL,
    ai_model VARCHAR(50) NOT NULL,   -- 'chatgpt_search', 'perplexity', 'gemini'
    full_response TEXT,
    is_mentioned BOOLEAN DEFAULT FALSE,
    mention_rank INTEGER,            -- 何番目に紹介されたか (null or 1, 2, 3...)
    sentiment VARCHAR(20),          -- 'positive', 'neutral', 'negative'
    cited_sources JSONB,             -- [{"url": "...", "domain": "..."}]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. 生成されたアクション指示（週次/日次）
CREATE TABLE IF NOT EXISTS public.action_recommendations (
    id BIGSERIAL PRIMARY KEY,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    priority VARCHAR(20) NOT NULL,   -- 'high', 'medium', 'info'
    category VARCHAR(20) NOT NULL,   -- 'seo', 'geo', 'content'
    title VARCHAR(255) NOT NULL,
    issue_description TEXT NOT NULL,
    action_directive TEXT NOT NULL,
    action_link TEXT,
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. 初期シードデータ
INSERT INTO public.keywords (keyword, area_category, target_category) VALUES
('個人レッスン 水泳 東京', 'tokyo_23', 'adult'),
('水泳 マンツーマン 横浜', 'kanagawa', 'adult'),
('出張 水泳 世田谷区', 'tokyo_23', 'junior'),
('水泳 個人指導 千葉', 'chiba', 'junior'),
('水泳 泳ぎ直し 大人 東京', 'tokyo_23', 'adult'),
('子供 水泳 個人指導 横浜', 'kanagawa', 'junior'),
('水恐怖症 水泳レッスン 東京', 'tokyo_23', 'phobia'),
('トライアスロン スイム指導 東京', 'tokyo_23', 'triathlon')
ON CONFLICT (keyword) DO NOTHING;

INSERT INTO public.geo_prompts (prompt_text, intent_category) VALUES
('東京で大人の初心者におすすめの水泳個人レッスンは？', 'adult'),
('横浜で子供の水嫌いを克服できる出張スイミング教室を教えて', 'junior'),
('首都圏で評判の良いマンツーマン水泳レッスンの比較は？', 'comparison'),
('水恐怖症の大人が安心して通える水泳個人指導はどこ？', 'phobia'),
('トライアスロンのスイムでタイムを伸ばす個人コーチは？', 'triathlon')
ON CONFLICT (prompt_text) DO NOTHING;
