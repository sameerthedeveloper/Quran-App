/**
 * Supabase Data Exporter
 * 
 * This script connects to your existing Supabase project and downloads all
 * relevant tables into JSON files for migration to Firestore.
 * 
 * Usage:
 * 1. Install dependencies: `npm install @supabase/supabase-js dotenv`
 * 2. Set environment variables in a .env file
 * 3. Run: `node export_supabase.js`
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs/promises');
const path = require('path');

// Configure your Supabase URL and Service Role Key in .env
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const DATA_DIR = path.join(__dirname, 'data');

async function fetchAllRecords(tableName) {
    let allRecords = [];
    let limit = 1000;
    let offset = 0;
    let hasMore = true;

    console.log(`Fetching from table: ${tableName}...`);

    while (hasMore) {
        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .range(offset, offset + limit - 1);

        if (error) {
            console.error(`❌ Error fetching ${tableName}:`, error.message);
            throw error;
        }

        if (data.length > 0) {
            allRecords = allRecords.concat(data);
            offset += limit;
            console.log(`  -> Retrieved ${allRecords.length} records so far...`);
        } else {
            hasMore = false;
        }
    }

    return allRecords;
}

async function exportTable(tableName) {
    try {
        const records = await fetchAllRecords(tableName);
        const filePath = path.join(DATA_DIR, `${tableName}.json`);

        await fs.writeFile(filePath, JSON.stringify(records, null, 2));
        console.log(`✅ Exported ${records.length} records to ${filePath}\n`);
    } catch (err) {
        console.error(`❌ Failed to export ${tableName}`, err);
    }
}

async function runExport() {
    console.log('🚀 Starting Supabase export...\n');

    // Create data directory if it doesn't exist
    await fs.mkdir(DATA_DIR, { recursive: true });

    // List of tables to export based on the schema
    const tablesToExport = [
        'profiles',
        'listening_logs',
        'reflections',
        'surah_timelines'
    ];

    for (const table of tablesToExport) {
        await exportTable(table);
    }

    console.log('🎉 Export complete! You can now run the migration script to upload to Firestore.');
}

runExport();
