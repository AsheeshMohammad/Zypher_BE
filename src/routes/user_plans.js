import express from 'express';
import sql from 'mssql';
import { getConnection } from '../config/database.js';

const router = express.Router();

// Middleware to extract user ID from token (assuming auth middleware is applied in server.js or per route)
// Since we don't have a shared auth middleware file visible in the previous listings (auth logic was in auth.js), 
// I'll replicate the token verification or assume the request is already populated by a middleware if one existed.
// Looking at server.js, there is no global auth middleware applied.
// I will add a simple middleware helper here or rely on the caller passing the header. 
// Ideally, I should verify the token. 

import jwt from 'jsonwebtoken';

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid token' });
    }
};

// GET current plan for logged in user
router.get('/current', verifyToken, async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('userId', sql.Int, req.user.id)
            .execute('SP_ZY_GetUserCurrentPlan');

        // If no active plan found, return null or specific message
        const currentPlan = result.recordset.length > 0 ? result.recordset[0] : null;

        res.json({
            success: true,
            data: currentPlan
        });
    } catch (error) {
        console.error('Error fetching user plan:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user plan',
            error: error.message
        });
    }
});

// POST map user to plan
router.post('/', verifyToken, async (req, res) => {
    try {
        const { planId } = req.body;

        if (!planId) {
            return res.status(400).json({
                success: false,
                message: 'Missing required field: planId'
            });
        }

        const pool = await getConnection();
        const result = await pool.request()
            .input('userId', sql.Int, req.user.id)
            .input('planId', sql.VarChar(50), planId)
            .execute('SP_ZY_MapUserPlan');

        const success = result.recordset[0].Success;
        const message = result.recordset[0].Message;

        if (success) {
            res.json({
                success: true,
                message: message
            });
        } else {
            res.status(400).json({
                success: false,
                message: message
            });
        }

    } catch (error) {
        console.error('Error mapping user plan:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to map user plan',
            error: error.message
        });
    }
});

export default router;
