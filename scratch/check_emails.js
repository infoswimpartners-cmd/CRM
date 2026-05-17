
const { createAdminClient } = require('./src/lib/supabase/admin');

async function checkTriggers() {
    const supabase = createAdminClient();
    const { data: triggers, error } = await supabase.from('email_triggers').select('*');
    if (error) {
        console.error('Error fetching triggers:', error);
        return;
    }
    console.log('--- Email Triggers ---');
    triggers.forEach(t => {
        console.log(`ID: ${t.id}, Enabled: ${t.is_enabled}, TemplateID: ${t.template_id}`);
    });

    const { data: templates } = await supabase.from('email_templates').select('id, key, subject');
    console.log('\n--- Email Templates ---');
    templates.forEach(t => {
        console.log(`ID: ${t.id}, Key: ${t.key}, Subject: ${t.subject}`);
    });
}

checkTriggers();
