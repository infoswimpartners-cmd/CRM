-- 記事自動生成・内製化コンテンツ管理テーブル
CREATE TABLE IF NOT EXISTS public.generated_articles (
    id TEXT PRIMARY KEY,
    keyword TEXT NOT NULL,
    article_type TEXT NOT NULL CHECK (article_type IN ('seo', 'aio')),
    title TEXT NOT NULL,
    meta_description TEXT,
    content_md TEXT NOT NULL,
    content_html TEXT NOT NULL,
    faq_items JSONB,
    json_ld TEXT,
    target_path TEXT NOT NULL DEFAULT '/',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    published_at TIMESTAMPTZ
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_generated_articles_status ON public.generated_articles (status);
CREATE INDEX IF NOT EXISTS idx_generated_articles_keyword ON public.generated_articles (keyword);
CREATE INDEX IF NOT EXISTS idx_generated_articles_created_at ON public.generated_articles (created_at DESC);
