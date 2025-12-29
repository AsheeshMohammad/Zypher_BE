import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { getConnection } from '../config/database.js';
import sql from 'mssql';

const router = express.Router();

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: number
 *                 email:
 *                   type: string
 */
router.get('/profile', authenticateToken, (req, res) => {
  res.json({
    user: req.userClaims,
    message: 'Profile retrieved successfully'
  });
});

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 */
router.get('/', authenticateToken, authorize(['admin', 'read_users']), (req, res) => {
  // Mock users data
  const users = [
    { id: 1, email: 'admin@example.com', role: 'admin' },
    { id: 2, email: 'user@example.com', role: 'user' }
  ];
  
  res.json({
    users,
    requestedBy: req.userClaims.email,
    message: 'Users retrieved successfully'
  });
});

// Get User Activity
router.get('/activity', authenticateToken, async (req, res) => {
  const userId = req.userClaims.id;
  const { offset = 0 } = req.query;
  
  try {
    const pool = await getConnection();
    const request = pool.request();
    
    request.input('UserId', sql.VarChar(50), userId);
    request.input('Offset', sql.Int, parseInt(offset));
    
    const result = await request.query(`
      SELECT 
        ActionType,
        ActionDetails,
        CreatedOn,
        PostId,
        CommentId
      FROM ZY_tbl_PostLogs 
      WHERE UserId = @UserId 
      ORDER BY CreatedOn DESC
      OFFSET @Offset ROWS
      FETCH NEXT 10 ROWS ONLY
    `);
    
    res.json({
      success: true,
      activities: result.recordset,
      hasMore: result.recordset.length === 10
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get User Name
router.get('/:userId/name', authenticateToken, async (req, res) => {
  const { userId } = req.params;
  
  try {
    const pool = await getConnection();
    const request = pool.request();
    
    request.input('UserId', sql.VarChar(50), userId);
    
    const result = await request.query(`
      SELECT 
        COALESCE(NULLIF(TRIM(UserName), ''), 'User') AS DisplayName,
        Designation
      FROM ZY_UserMaster 
      WHERE Id = @UserId
    `);
    
    res.json({
      success: true,
      displayName: result.recordset[0]?.DisplayName || 'Unknown User',
      designation: result.recordset[0]?.Designation || 'Not specified'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;