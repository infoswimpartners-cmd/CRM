ALTER TABLE public.email_templates ADD COLUMN sort_order INTEGER DEFAULT 0;

-- Set sequential sort_order starting from 1
WITH numbered_templates AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY updated_at ASC) as new_order
    FROM public.email_templates
)
UPDATE public.email_templates
SET sort_order = numbered_templates.new_order
FROM numbered_templates
WHERE email_templates.id = numbered_templates.id;
