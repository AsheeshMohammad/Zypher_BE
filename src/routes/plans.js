import express from 'express';
import sql from 'mssql';
import { getConnection } from '../config/database.js';

const router = express.Router();

// GET all plans
// Query param: ?isActive=true|false (optional)
router.get('/', async (req, res) => {
    try {
        const pool = await getConnection();
        const isActiveParam = req.query.isActive;

        let isActive = null;
        if (isActiveParam === 'true' || isActiveParam === '1') isActive = 1;
        if (isActiveParam === 'false' || isActiveParam === '0') isActive = 0;

        const result = await pool.request()
            .input('isActive', sql.Bit, isActive)
            .execute('SP_ZY_GetPlans');

        res.json({
            success: true,
            data: result.recordset
        });
    } catch (error) {
        console.error('Error fetching plans:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch plans',
            error: error.message
        });
    }
});

// POST upsert plan
router.post('/', async (req, res) => {
    try {
        const { id, title, price, subtitle, isActive } = req.body;

        if (!id || !title || !price) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: id, title, price'
            });
        }

        const pool = await getConnection();
        await pool.request()
            .input('id', sql.VarChar(50), id)
            .input('title', sql.NVarChar(100), title)
            .input('price', sql.NVarChar(50), price)
            .input('subtitle', sql.NVarChar(255), subtitle)
            .input('isActive', sql.Bit, isActive !== undefined ? isActive : 1)
            .execute('SP_ZY_UpsertPlan');

        res.json({
            success: true,
            message: 'Plan saved successfully'
        });
    } catch (error) {
        console.error('Error saving plan:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save plan',
            error: error.message
        });
    }
});

export default router;
