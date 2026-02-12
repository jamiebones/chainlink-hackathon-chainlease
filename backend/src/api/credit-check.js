// api/credit-check.js
// Credit check API endpoints (Mock implementation)

import express from 'express';

const router = express.Router();

/**
 * Mock credit score database
 * In production, this would call Experian, Equifax, TransUnion, etc.
 */
const mockTenantData = {
    '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb': {
        creditScore: 720,
        riskLevel: 'low',
        paymentHistory: 'Excellent',
        debtToIncome: 0.28,
        bankruptcies: 0,
        evictions: 0
    },
    '0x123': {
        creditScore: 580,
        riskLevel: 'high',
        paymentHistory: 'Poor',
        debtToIncome: 0.55,
        bankruptcies: 1,
        evictions: 2
    },
    // Default for unknown addresses
    'default': {
        creditScore: 650,
        riskLevel: 'medium',
        paymentHistory: 'Fair',
        debtToIncome: 0.35,
        bankruptcies: 0,
        evictions: 0
    }
};

/**
 * POST /api/credit-check/verify
 * Performs a credit check for a tenant
 * 
 * Request Body:
 * {
 *   "leaseId": "123",
 *   "tenantAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
 *   "timestamp": 1739318400000
 * }
 */
router.post('/verify', async (req, res) => {
    try {
        const { leaseId, tenantAddress, timestamp } = req.body;

        // Validation
        if (!leaseId || !tenantAddress) {
            return res.status(400).json({
                error: 'Missing required fields: leaseId, tenantAddress'
            });
        }

        console.log(`📋 Credit check requested for tenant: ${tenantAddress}`);

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Get mock data or use default
        const tenantData = mockTenantData[tenantAddress] || mockTenantData['default'];

        // Determine pass/fail based on score
        const MIN_CREDIT_SCORE = 620;
        const passed = tenantData.creditScore >= MIN_CREDIT_SCORE &&
            ['low', 'medium'].includes(tenantData.riskLevel);

        // Generate verification ID
        const verificationId = `verify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const response = {
            leaseId,
            tenantAddress,
            creditScore: tenantData.creditScore,
            passed,
            riskLevel: tenantData.riskLevel,
            verificationId,
            timestamp: timestamp || Date.now(),
            details: {
                paymentHistory: tenantData.paymentHistory,
                debtToIncome: tenantData.debtToIncome,
                bankruptcies: tenantData.bankruptcies,
                evictions: tenantData.evictions
            }
        };

        console.log(`✅ Credit check completed: Score ${tenantData.creditScore}, ${passed ? 'PASSED' : 'FAILED'}`);

        res.json(response);

    } catch (error) {
        console.error('Error in credit check:', error);
        res.status(500).json({ error: 'Credit check failed' });
    }
});

/**
 * POST /api/credit-check/add-tenant
 * Add or update mock tenant data (for testing)
 */
router.post('/add-tenant', (req, res) => {
    try {
        const { tenantAddress, creditScore, riskLevel, ...details } = req.body;

        if (!tenantAddress || !creditScore) {
            return res.status(400).json({
                error: 'Missing required fields: tenantAddress, creditScore'
            });
        }

        mockTenantData[tenantAddress] = {
            creditScore,
            riskLevel: riskLevel || 'medium',
            ...details
        };

        res.json({
            success: true,
            message: `Mock data added for ${tenantAddress}`,
            data: mockTenantData[tenantAddress]
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/credit-check/tenant/:address
 * Get mock tenant data
 */
router.get('/tenant/:address', (req, res) => {
    const { address } = req.params;
    const data = mockTenantData[address];

    if (!data) {
        return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json(data);
});

export default router;
