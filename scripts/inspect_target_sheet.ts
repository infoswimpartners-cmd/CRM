import { google } from 'googleapis';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkSheet() {
    const spreadsheetId = '1DLMYid10VpYGPoHWkpqXcIku92oVkZ4Y9aMMtVKxq4s';
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountJson) {
        console.error('GOOGLE_SERVICE_ACCOUNT_KEY not found');
        return;
    }
    const credentials = JSON.parse(serviceAccountJson);
    const rawKey = credentials.private_key || '';
    const privateKey = rawKey.includes('\\n') ? rawKey.replace(/\\n/g, '\n') : rawKey;
    const auth = new google.auth.JWT({
        email: credentials.client_email,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    try {
        const meta = await sheets.spreadsheets.get({ spreadsheetId });
        console.log('Title:', meta.data.properties?.title);
        const sheetList = (meta.data.sheets || []).map(s => s.properties?.title);
        console.log('Sheets:', sheetList);

        if (sheetList.length > 0) {
            const firstSheet = sheetList[0];
            const rows = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: `${firstSheet}!A1:Z5`,
            });
            console.log(`First sheet [${firstSheet}] top rows:`, rows.data.values);
        }
    } catch (err: any) {
        console.error('Error accessing sheet:', err.message);
        if (err.message.includes('permission') || err.message.includes('403') || err.message.includes('not found')) {
            console.log('Service account email to share with:', credentials.client_email);
        }
    }
}

checkSheet();
