// server.js
// ChainLease Backend API Server

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { connectToDatabase } from './services/database.js';
import creditCheckRouter from './api/credit-check.js';
import dataRouter from './api/data.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'chainlease-backend'
    });
});

// API Routes
app.use('/api/credit-check', creditCheckRouter);
app.use('/api/data', dataRouter);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
    });
});

// Start server
const startServer = async () => {
    try {
        // Connect to MongoDB
        await connectToDatabase();

        app.listen(PORT, () => {
            console.log(`✅ ChainLease Backend API running on port ${PORT}`);
            console.log(`📍 Health check: http://localhost:${PORT}/health`);
            console.log(`🔍 Credit Check: http://localhost:${PORT}/api/credit-check/verify`);
            console.log(`💾 Data API: http://localhost:${PORT}/api/data/credit-checks`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
