// backend/src/api/users.js
// User management API endpoints

import express from 'express';
import { getDatabase } from '../services/database.js';

const router = express.Router();

/**
 * POST /api/users/register
 * Register or update a user profile
 * 
 * Request Body:
 * {
 *   "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
 *   "email": "user@example.com",
 *   "name": "John Doe",
 *   "phone": "+1234567890" (optional),
 *   "role": "tenant" | "landlord" (optional)
 * }
 */
router.post('/register', async (req, res) => {
    try {
        const { walletAddress, email, name, phone, role } = req.body;

        // Validation
        if (!walletAddress || !email) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: walletAddress, email'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
            });
        }

        // Validate wallet address format
        const addressRegex = /^0x[a-fA-F0-9]{40}$/;
        if (!addressRegex.test(walletAddress)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid wallet address format'
            });
        }

        const db = getDatabase();
        const users = db.collection('users');

        // Normalize address to lowercase for consistency
        const normalizedAddress = walletAddress.toLowerCase();

        // Check if email is already used by another address
        const existingEmail = await users.findOne({
            email: email.toLowerCase(),
            address: { $ne: normalizedAddress }
        });

        if (existingEmail) {
            return res.status(409).json({
                success: false,
                error: 'Email already registered to another wallet address'
            });
        }

        // Upsert user document
        const result = await users.updateOne(
            { address: normalizedAddress },
            {
                $set: {
                    address: normalizedAddress,
                    email: email.toLowerCase(),
                    name: name || null,
                    phone: phone || null,
                    role: role || 'tenant',
                    updatedAt: new Date()
                },
                $setOnInsert: {
                    createdAt: new Date(),
                    emailVerified: false
                }
            },
            { upsert: true }
        );

        const user = await users.findOne({ address: normalizedAddress });

        console.log(`✅ User ${result.upsertedCount ? 'registered' : 'updated'}: ${normalizedAddress}`);

        res.json({
            success: true,
            message: result.upsertedCount ? 'User registered successfully' : 'User updated successfully',
            user: {
                address: user.address,
                email: user.email,
                name: user.name,
                phone: user.phone,
                role: user.role,
                emailVerified: user.emailVerified,
                createdAt: user.createdAt
            }
        });

    } catch (error) {
        console.error('Error in user registration:', error);
        res.status(500).json({
            success: false,
            error: 'User registration failed',
            details: error.message
        });
    }
});

/**
 * GET /api/users/:address
 * Get user profile by wallet address
 */
router.get('/:address', async (req, res) => {
    try {
        const { address } = req.params;

        // Validate address format
        const addressRegex = /^0x[a-fA-F0-9]{40}$/;
        if (!addressRegex.test(address)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid wallet address format'
            });
        }

        const db = getDatabase();
        const users = db.collection('users');

        const user = await users.findOne({
            address: address.toLowerCase()
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            user: {
                address: user.address,
                email: user.email,
                name: user.name,
                phone: user.phone,
                role: user.role,
                emailVerified: user.emailVerified,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            }
        });

    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user'
        });
    }
});

/**
 * PUT /api/users/:address
 * Update user profile
 */
router.put('/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const { email, name, phone, role } = req.body;

        // Validate address format
        const addressRegex = /^0x[a-fA-F0-9]{40}$/;
        if (!addressRegex.test(address)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid wallet address format'
            });
        }

        const db = getDatabase();
        const users = db.collection('users');

        // Check if user exists
        const existingUser = await users.findOne({
            address: address.toLowerCase()
        });

        if (!existingUser) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Build update object
        const updateFields = {
            updatedAt: new Date()
        };

        if (email) {
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid email format'
                });
            }

            // Check if email is already used by another address
            const emailConflict = await users.findOne({
                email: email.toLowerCase(),
                address: { $ne: address.toLowerCase() }
            });

            if (emailConflict) {
                return res.status(409).json({
                    success: false,
                    error: 'Email already registered to another wallet address'
                });
            }

            updateFields.email = email.toLowerCase();
        }

        if (name !== undefined) updateFields.name = name;
        if (phone !== undefined) updateFields.phone = phone;
        if (role !== undefined) updateFields.role = role;

        await users.updateOne(
            { address: address.toLowerCase() },
            { $set: updateFields }
        );

        const updatedUser = await users.findOne({
            address: address.toLowerCase()
        });

        console.log(`✅ User updated: ${address.toLowerCase()}`);

        res.json({
            success: true,
            message: 'User updated successfully',
            user: {
                address: updatedUser.address,
                email: updatedUser.email,
                name: updatedUser.name,
                phone: updatedUser.phone,
                role: updatedUser.role,
                emailVerified: updatedUser.emailVerified,
                createdAt: updatedUser.createdAt,
                updatedAt: updatedUser.updatedAt
            }
        });

    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update user'
        });
    }
});

/**
 * GET /api/users/email/:email
 * Get user by email address
 */
router.get('/email/:email', async (req, res) => {
    try {
        const { email } = req.params;

        const db = getDatabase();
        const users = db.collection('users');

        const user = await users.findOne({
            email: email.toLowerCase()
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            user: {
                address: user.address,
                email: user.email,
                name: user.name,
                role: user.role,
                emailVerified: user.emailVerified
            }
        });

    } catch (error) {
        console.error('Error fetching user by email:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user'
        });
    }
});

/**
 * DELETE /api/users/:address
 * Delete user account
 */
router.delete('/:address', async (req, res) => {
    try {
        const { address } = req.params;

        // Validate address format
        const addressRegex = /^0x[a-fA-F0-9]{40}$/;
        if (!addressRegex.test(address)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid wallet address format'
            });
        }

        const db = getDatabase();
        const users = db.collection('users');

        const result = await users.deleteOne({
            address: address.toLowerCase()
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        console.log(`✅ User deleted: ${address.toLowerCase()}`);

        res.json({
            success: true,
            message: 'User deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete user'
        });
    }
});

export default router;
