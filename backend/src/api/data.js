// api/data.js
// Data persistence API endpoints

import express from 'express';
import { getDatabase } from '../services/database.js';

const router = express.Router();

/**
 * POST /api/data/credit-checks
 * Save credit check result to database
 * 
 * Request Body:
 * {
 *   "leaseId": "123",
 *   "tenantAddress": "0x...",
 *   "creditScore": 720,
 *   "passed": true,
 *   "riskLevel": "low",
 *   "verificationId": "verify_...",
 *   "txHash": "0x...",
 *   "timestamp": 1739318400000,
 *   "details": { ... }
 * }
 */
router.post('/credit-checks', async (req, res) => {
    try {
        const db = getDatabase();
        const collection = db.collection('creditChecks');

        const document = {
            ...req.body,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const result = await collection.insertOne(document);

        console.log(`✅ Credit check saved to database: ${result.insertedId}`);

        res.status(201).json({
            success: true,
            insertedId: result.insertedId.toString(),
            message: 'Credit check record saved successfully'
        });

    } catch (error) {
        console.error('Error saving credit check:', error);
        res.status(500).json({ error: 'Failed to save credit check' });
    }
});

/**
 * GET /api/data/credit-checks/:leaseId
 * Get credit check by lease ID
 */
router.get('/credit-checks/:leaseId', async (req, res) => {
    try {
        const db = getDatabase();
        const collection = db.collection('creditChecks');

        const result = await collection.findOne({
            leaseId: req.params.leaseId
        });

        if (!result) {
            return res.status(404).json({ error: 'Credit check not found' });
        }

        res.json(result);

    } catch (error) {
        console.error('Error fetching credit check:', error);
        res.status(500).json({ error: 'Failed to fetch credit check' });
    }
});

/**
 * GET /api/data/credit-checks/tenant/:address
 * Get all credit checks for a tenant
 */
router.get('/credit-checks/tenant/:address', async (req, res) => {
    try {
        const db = getDatabase();
        const collection = db.collection('creditChecks');

        const results = await collection
            .find({ tenantAddress: req.params.address })
            .sort({ createdAt: -1 })
            .toArray();

        res.json({
            count: results.length,
            creditChecks: results
        });

    } catch (error) {
        console.error('Error fetching credit checks:', error);
        res.status(500).json({ error: 'Failed to fetch credit checks' });
    }
});

/**
 * POST /api/data/leases
 * Save lease data
 */
router.post('/leases', async (req, res) => {
    try {
        const db = getDatabase();
        const collection = db.collection('leases');

        const document = {
            ...req.body,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const result = await collection.insertOne(document);

        res.status(201).json({
            success: true,
            insertedId: result.insertedId.toString()
        });

    } catch (error) {
        console.error('Error saving lease:', error);
        res.status(500).json({ error: 'Failed to save lease' });
    }
});

/**
 * GET /api/data/leases/:leaseId
 * Get lease by ID
 */
router.get('/leases/:leaseId', async (req, res) => {
    try {
        const db = getDatabase();
        const collection = db.collection('leases');

        const result = await collection.findOne({
            leaseId: req.params.leaseId
        });

        if (!result) {
            return res.status(404).json({ error: 'Lease not found' });
        }

        res.json(result);

    } catch (error) {
        console.error('Error fetching lease:', error);
        res.status(500).json({ error: 'Failed to fetch lease' });
    }
});

export default router;
