const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const sql = require('mssql');

// Get notifications for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = await sql.connect();
    const result = await pool.request()
      .input('UserId', sql.Int, req.user.id)
      .execute('SP_ZY_GetNotifications');

    res.json({ success: true, notifications: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const pool = await sql.connect();
    await pool.request()
      .input('NotificationId', sql.Int, req.params.id)
      .input('UserId', sql.Int, req.user.id)
      .execute('SP_ZY_MarkNotificationRead');

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
  }
});

module.exports = router;