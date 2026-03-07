/**
 * Firestore Data Migrator
 * 
 * This script reads the JSON files exported from Supabase and transforms
 * the relational data into a NoSQL structure suitable for Firestore,
 * then uploads it using batch operations.
 * 
 * Usage:
 * 1. Install dependencies: `npm install firebase-admin`
 * 2. Place your Firebase Admin Service Account JSON file in this directory
 * 3. Run: `node migrate_to_firestore.js`
 */

const admin = require('firebase-admin');
const fs = require('fs/promises');
const path = require('path');

// Initialize Firebase Admin SDK
// You must download a service account key from the Firebase Console 
// (Project Settings > Service Accounts > Generate new private key)
const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');
try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (error) {
    console.error(`❌ Failed to load service account credentials at ${serviceAccountPath}`);
    console.error('Please download it from Firebase Console and place it in the migration directory.');
    process.exit(1);
}

const db = admin.firestore();
const DATA_DIR = path.join(__dirname, 'data');

// Firestore batched writes cap at 500 operations
const BATCH_SIZE = 450;

async function readJson(filename) {
    try {
        const data = await fs.readFile(path.join(DATA_DIR, filename), 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.warn(`⚠️ Could not read ${filename}. Skipping...`);
        return [];
    }
}

async function migrateProfiles() {
    console.log('Migrating Profiles to /users/{userId} ...');
    const profiles = await readJson('profiles.json');

    let batch = db.batch();
    let count = 0;

    for (const profile of profiles) {
        const userRef = db.collection('users').doc(profile.id);
        batch.set(userRef, {
            username: profile.username || '',
            total_minutes: profile.total_minutes || 0,
            streak: profile.streak || 0,
            completed_surahs: profile.completed_surahs || 0,
            privacy: profile.privacy !== false, // Defaults to true
            created_at: profile.created_at ? admin.firestore.Timestamp.fromDate(new Date(profile.created_at)) : admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        count++;
        if (count % BATCH_SIZE === 0) {
            await batch.commit();
            console.log(`  -> Committed ${count} profiles`);
            batch = db.batch();
        }
    }

    if (count % BATCH_SIZE !== 0) await batch.commit();
    console.log(`✅ Finished migrating ${profiles.length} profiles.\n`);
}

async function migrateListeningLogs() {
    console.log('Migrating Listening Logs to /users/{userId}/listening_logs/{logId} ...');
    const logs = await readJson('listening_logs.json');

    let batch = db.batch();
    let count = 0;

    for (const log of logs) {
        const logRef = db.collection('users').doc(log.user_id).collection('listening_logs').doc(log.id);
        batch.set(logRef, {
            surah: log.surah,
            ayah: log.ayah || 1,
            seconds_listened: log.seconds_listened || 0,
            created_at: log.created_at ? admin.firestore.Timestamp.fromDate(new Date(log.created_at)) : admin.firestore.FieldValue.serverTimestamp()
        });

        count++;
        if (count % BATCH_SIZE === 0) {
            await batch.commit();
            console.log(`  -> Committed ${count} logs`);
            batch = db.batch();
        }
    }

    if (count % BATCH_SIZE !== 0) await batch.commit();
    console.log(`✅ Finished migrating ${logs.length} listening logs.\n`);
}

async function migrateReflections() {
    console.log('Migrating Reflections to /public_notes/{noteId} ...');
    const reflections = await readJson('reflections.json');

    let batch = db.batch();
    let count = 0;

    for (const reflection of reflections) {
        const noteRef = db.collection('public_notes').doc(reflection.id);
        batch.set(noteRef, {
            userId: reflection.user_id,
            username: reflection.username || 'Anonymous',
            message: reflection.message,
            surah: reflection.surah,
            created_at: reflection.created_at ? admin.firestore.Timestamp.fromDate(new Date(reflection.created_at)) : admin.firestore.FieldValue.serverTimestamp()
        });

        count++;
        if (count % BATCH_SIZE === 0) {
            await batch.commit();
            console.log(`  -> Committed ${count} reflections`);
            batch = db.batch();
        }
    }

    if (count % BATCH_SIZE !== 0) await batch.commit();
    console.log(`✅ Finished migrating ${reflections.length} reflections.\n`);
}

async function migrateTimelines() {
    console.log('Migrating Timelines to /surah_timelines/{timelineId} ...');
    const timelines = await readJson('surah_timelines.json');

    let batch = db.batch();
    let count = 0;

    for (const tl of timelines) {
        // Generate a composite ID for Firestore
        const timelineId = `${tl.surah_no}_${tl.reciter_id}`;
        const timelineRef = db.collection('surah_timelines').doc(timelineId);

        batch.set(timelineRef, {
            surah_no: tl.surah_no,
            reciter_id: tl.reciter_id,
            durations: tl.durations, // Assuming it's already a JS Object/JSON
            created_at: tl.created_at ? admin.firestore.Timestamp.fromDate(new Date(tl.created_at)) : admin.firestore.FieldValue.serverTimestamp()
        });

        count++;
        if (count % BATCH_SIZE === 0) {
            await batch.commit();
            console.log(`  -> Committed ${count} timelines`);
            batch = db.batch();
        }
    }

    if (count % BATCH_SIZE !== 0) await batch.commit();
    console.log(`✅ Finished migrating ${timelines.length} timelines.\n`);
}

async function runMigration() {
    console.log('🚀 Starting final Firestore upload phase...\n');

    await migrateProfiles();
    await migrateListeningLogs();
    await migrateReflections();
    await migrateTimelines();

    console.log('🎉 Migration Successfully Completed!');
}

runMigration();
