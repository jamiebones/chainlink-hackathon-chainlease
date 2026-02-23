// scripts/setup-database.ts
// Initialize MongoDB indexes for optimal performance

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI!
const MONGODB_DATABASE = process.env.MONGODB_DATABASE!

async function setupDatabase() {
    const client = new MongoClient(MONGODB_URI);

    try {
        console.log('Connecting to MongoDB...');
        await client.connect();

        const db = client.db(MONGODB_DATABASE);
        console.log(`Connected to database: ${MONGODB_DATABASE}\n`);

        // ========================================
        // PROPERTIES COLLECTION
        // ========================================
        console.log('Setting up properties collection...');
        const propertiesCollection = db.collection('properties');

        // Index on tokenId (unique)
        await propertiesCollection.createIndex(
            { tokenId: 1 },
            { unique: true, name: 'tokenId_unique' }
        );
        console.log('✓ Created unique index on tokenId');

        // Index on owner address
        await propertiesCollection.createIndex(
            { owner: 1 },
            { name: 'owner_index' }
        );
        console.log('✓ Created index on owner');

        // Index on status
        await propertiesCollection.createIndex(
            { status: 1 },
            { name: 'status_index' }
        );
        console.log('✓ Created index on status');

        // Index on property type
        await propertiesCollection.createIndex(
            { 'metadata.propertyType': 1 },
            { name: 'propertyType_index' }
        );
        console.log('✓ Created index on property type');

        // Index on location (city, state, country)
        await propertiesCollection.createIndex(
            {
                'metadata.address.city': 1,
                'metadata.address.state': 1,
                'metadata.address.country': 1,
            },
            { name: 'location_index' }
        );
        console.log('✓ Created compound index on location');

        // Index on rent amount (for filtering)
        await propertiesCollection.createIndex(
            { 'pricing.rentAmount': 1 },
            { name: 'rentAmount_index' }
        );
        console.log('✓ Created index on rent amount');

        // Index on bedrooms
        await propertiesCollection.createIndex(
            { 'metadata.features.bedrooms': 1 },
            { name: 'bedrooms_index' }
        );
        console.log('✓ Created index on bedrooms');

        // Index on amenities (for filtering)
        await propertiesCollection.createIndex(
            { 'metadata.features.amenities': 1 },
            { name: 'amenities_index' }
        );
        console.log('✓ Created index on amenities');

        // Index on petFriendly and furnished
        await propertiesCollection.createIndex(
            {
                'metadata.features.petFriendly': 1,
                'metadata.features.furnished': 1,
            },
            { name: 'boolean_features_index' }
        );
        console.log('✓ Created index on boolean features');

        // Index on createdAt (for sorting)
        await propertiesCollection.createIndex(
            { createdAt: -1 },
            { name: 'createdAt_desc_index' }
        );
        console.log('✓ Created index on createdAt');

        // Text index for full-text search
        await propertiesCollection.createIndex(
            {
                'metadata.name': 'text',
                'metadata.description': 'text',
                'metadata.address.city': 'text',
                'metadata.address.state': 'text',
                'metadata.address.country': 'text',
            },
            { name: 'text_search_index' }
        );
        console.log('✓ Created text search index');

        // ========================================
        // USERS COLLECTION
        // ========================================
        console.log('\nSetting up users collection...');
        const usersCollection = db.collection('users');

        // Index on wallet address (unique)
        await usersCollection.createIndex(
            { address: 1 },
            { unique: true, name: 'address_unique' }
        );
        console.log('✓ Created unique index on wallet address');

        // Index on worldIdNullifier (unique, sparse)
        await usersCollection.createIndex(
            { worldIdNullifier: 1 },
            { unique: true, sparse: true, name: 'worldIdNullifier_unique' }
        );
        console.log('✓ Created unique sparse index on worldIdNullifier');

        // Index on email
        await usersCollection.createIndex(
            { email: 1 },
            { sparse: true, name: 'email_index' }
        );
        console.log('✓ Created index on email');

        // ========================================
        // WORLD ID VERIFICATIONS COLLECTION
        // ========================================
        console.log('\nSetting up worldIdVerifications collection...');
        const verificationsCollection = db.collection('worldIdVerifications');

        // Index on nullifier_hash (unique)
        await verificationsCollection.createIndex(
            { nullifier_hash: 1 },
            { unique: true, name: 'nullifier_unique' }
        );
        console.log('✓ Created unique index on nullifier_hash');

        // Index on wallet address
        await verificationsCollection.createIndex(
            { walletAddress: 1 },
            { name: 'walletAddress_index' }
        );
        console.log('✓ Created index on wallet address');

        // Index on merkle_root
        await verificationsCollection.createIndex(
            { merkle_root: 1 },
            { name: 'merkle_root_index' }
        );
        console.log('✓ Created index on merkle_root');

        // ========================================
        // CREDIT CHECKS COLLECTION
        // ========================================
        console.log('\nSetting up creditChecks collection...');
        const creditChecksCollection = db.collection('creditChecks');

        // Index on tenant address
        await creditChecksCollection.createIndex(
            { tenantAddress: 1 },
            { name: 'tenantAddress_index' }
        );
        console.log('✓ Created index on tenant address');

        // Index on leaseId
        await creditChecksCollection.createIndex(
            { leaseId: 1 },
            { name: 'leaseId_index' }
        );
        console.log('✓ Created index on leaseId');

        // ========================================
        // RENT PAYMENTS COLLECTION
        // ========================================
        console.log('\nSetting up rentPayments collection...');
        const rentPaymentsCollection = db.collection('rentPayments');

        // Index on leaseId
        await rentPaymentsCollection.createIndex(
            { leaseId: 1 },
            { name: 'leaseId_index' }
        );
        console.log('✓ Created index on leaseId');

        // Index on paymentDate
        await rentPaymentsCollection.createIndex(
            { paymentDate: -1 },
            { name: 'paymentDate_desc_index' }
        );
        console.log('✓ Created index on paymentDate');

        // Compound index on leaseId and paymentDate
        await rentPaymentsCollection.createIndex(
            { leaseId: 1, paymentDate: -1 },
            { name: 'leaseId_paymentDate_index' }
        );
        console.log('✓ Created compound index on leaseId and paymentDate');

        console.log('\n✅ Database setup completed successfully!');
    } catch (error) {
        console.error('❌ Error setting up database:', error);
        throw error;
    } finally {
        await client.close();
        console.log('\nDatabase connection closed.');
    }
}

// Run the setup
setupDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
