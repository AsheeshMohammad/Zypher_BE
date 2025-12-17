import express from 'express';
import sql from 'mssql';
import { getConnection } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Add or Edit Comment
router.post('/', authenticateToken, async (req, res) => {
  const { commentId = 0, postId, commentText } = req.body;
  const userId = req.userClaims.id;
  
  try {
    const pool = await getConnection();
    const request = pool.request();
    
    request.input('CommentId', sql.Int, commentId);
    request.input('PostId', sql.Int, postId);
    request.input('UserId', sql.VarChar(50), userId);
    request.input('CommentText', sql.NVarChar(sql.MAX), commentText);
    
    const result = await request.execute('SP_ZY_AddOrEditComment');
    
    res.json({
      success: true,
      data: result.recordset[0]
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Delete Comment
router.delete('/:commentId', authenticateToken, async (req, res) => {
  const { commentId } = req.params;
  const userId = req.userClaims.id;
  
  try {
    const pool = await getConnection();
    const request = pool.request();
    
    request.input('CommentId', sql.Int, commentId);
    request.input('UserId', sql.VarChar(50), userId);
    
    const result = await request.execute('SP_ZY_DeleteComment');
    
    res.json({
      success: true,
      message: result.recordset[0].Message
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get Comments for Post
router.get('/:postId', authenticateToken, async (req, res) => {
  const { postId } = req.params;
  
  try {
    const pool = await getConnection();
    const request = pool.request();
    
    request.input('PostId', sql.Int, postId);
    
    const result = await request.query(`
      SELECT 
        c.CommentId,
        c.PostId,
        c.UserId,
        c.CommentText,
        c.CreatedOn,
        c.UpdatedOn,
        u.UserName
      FROM ZY_tbl_PostComments c
      LEFT JOIN ZY_UserMaster u ON c.UserId = u.Id
      WHERE c.PostId = @PostId AND c.IsActive = 1
      ORDER BY c.CreatedOn DESC
    `);
    
    res.json({
      success: true,
      comments: result.recordset
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;