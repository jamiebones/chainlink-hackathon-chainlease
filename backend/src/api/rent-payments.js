import express from 'express';
import { getDatabase } from '../services/database.js';

const router = express.Router();

/**
 * POST /api/rent-payments
 * Record rent payment from CRE workflow
 */
router.post('/', async (req, res) => {
    try {
        const { leaseId, tenant, amount, lateFee, transactionHash, timestamp, status } = req.body;

        // Validation
        if (!leaseId || !tenant || !amount || !transactionHash || !timestamp || !status) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                required: ['leaseId', 'tenant', 'amount', 'transactionHash', 'timestamp', 'status']
            });
        }

        // Validate status enum
        if (!['success', 'failed', 'late'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Must be: success, failed, or late'
            });
        }

        // Get database connection
        const db = await getDatabase();
        const rentPaymentsCollection = db.collection('rentPayments');

        // Create rent payment record
        const rentPayment = {
            leaseId,
            tenant: tenant.toLowerCase(),
            amount,
            lateFee: lateFee || '0',
            totalAmount: (BigInt(amount) + BigInt(lateFee || '0')).toString(),
            transactionHash,
            timestamp: new Date(parseInt(timestamp) * 1000),
            status,
            recordedAt: new Date(),
        };

        // Insert into database
        const result = await rentPaymentsCollection.insertOne(rentPayment);

        console.log(`Rent payment recorded for lease ${leaseId}: ${status}`);

        // TODO: Send email notification to tenant and landlord
        if (status === 'late') {
            console.log(`⚠️ Late payment for lease ${leaseId} - sending notification`);
            // await sendLatePaymentNotification(leaseId, tenant);
        }

        res.status(201).json({
            success: true,
            message: 'Rent payment recorded successfully',
            paymentId: result.insertedId.toString(),
            data: {
                leaseId,
                status,
                transactionHash,
            }
        });

    } catch (error) {
        console.error('Error recording rent payment:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
});

/**
 * GET /api/rent-payments/:leaseId
 * Get payment history for a specific lease
 */
router.get('/:leaseId', async (req, res) => {
    try {
        const { leaseId } = req.params;

        const db = await getDatabase();
        const rentPaymentsCollection = db.collection('rentPayments');

        const payments = await rentPaymentsCollection
            .find({ leaseId })
            .sort({ timestamp: -1 })
            .toArray();

        res.json({
            success: true,
            leaseId,
            count: payments.length,
            payments: payments.map(p => ({
                paymentId: p._id.toString(),
                amount: p.amount,
                lateFee: p.lateFee,
                totalAmount: p.totalAmount,
                transactionHash: p.transactionHash,
                timestamp: p.timestamp,
                status: p.status,
                recordedAt: p.recordedAt,
            }))
        });

    } catch (error) {
        console.error('Error fetching payment history:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/rent-payments/tenant/:address
 * Get all payments for a specific tenant
 */
router.get('/tenant/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const tenantAddress = address.toLowerCase();

        const db = await getDatabase();
        const rentPaymentsCollection = db.collection('rentPayments');

        const payments = await rentPaymentsCollection
            .find({ tenant: tenantAddress })
            .sort({ timestamp: -1 })
            .toArray();

        // Calculate statistics
        const totalPaid = payments.reduce((sum, p) => sum + BigInt(p.totalAmount), BigInt(0));
        const totalLateFees = payments.reduce((sum, p) => sum + BigInt(p.lateFee || '0'), BigInt(0));
        const lateCount = payments.filter(p => p.status === 'late').length;
        const failedCount = payments.filter(p => p.status === 'failed').length;

        res.json({
            success: true,
            tenant: tenantAddress,
            statistics: {
                totalPayments: payments.length,
                totalPaid: totalPaid.toString(),
                totalLateFees: totalLateFees.toString(),
                latePayments: lateCount,
                failedPayments: failedCount,
                onTimePayments: payments.length - lateCount - failedCount,
            },
            payments: payments.map(p => ({
                paymentId: p._id.toString(),
                leaseId: p.leaseId,
                amount: p.amount,
                lateFee: p.lateFee,
                totalAmount: p.totalAmount,
                transactionHash: p.transactionHash,
                timestamp: p.timestamp,
                status: p.status,
                recordedAt: p.recordedAt,
            }))
        });

    } catch (error) {
        console.error('Error fetching tenant payments:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

export default router;
