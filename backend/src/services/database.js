// services/database.js
// MongoDB connection and utilities

import { MongoClient } from 'mongodb';

let db = null;
let client = null;

export const connectToDatabase = async () => {
    if (db) return db;

    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.MONGODB_DATABASE || 'chainlease';

    try {
        client = new MongoClient(mongoUri);
        await client.connect();
        db = client.db(dbName);

        console.log(`✅ Connected to MongoDB: ${dbName}`);
        return db;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        throw error;
    }
};

export const getDatabase = () => {
    if (!db) {
        throw new Error('Database not initialized. Call connectToDatabase first.');
    }
    return db;
};

export const closeDatabase = async () => {
    if (client) {
        await client.close();
        console.log('✅ MongoDB connection closed');
    }
};

// Graceful shutdown
process.on('SIGINT', async () => {
    await closeDatabase();
    process.exit(0);
});
