// lib/db.ts
// MongoDB connection and utilities for Next.js

import { MongoClient, Db } from 'mongodb';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase() {
    // Return cached connection if available
    if (cachedClient && cachedDb) {
        return { client: cachedClient, db: cachedDb };
    }

    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.MONGODB_DATABASE || 'chainlease';

    try {
        const client = new MongoClient(mongoUri);
        await client.connect();
        const db = client.db(dbName);

        cachedClient = client;
        cachedDb = db;

        console.log(`✅ Connected to MongoDB: ${dbName}`);
        return { client, db };
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        throw error;
    }
}

export async function getDatabase(): Promise<Db> {
    const { db } = await connectToDatabase();
    return db;
}
