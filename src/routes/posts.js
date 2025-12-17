import express from 'express';
import sql from 'mssql';
import { getConnection } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/posts:
 *   get:
 *     summary: Get user posts
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Posts retrieved successfully
 *   post:
 *     summary: Create or edit a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               postId:
 *                 type: integer
 *                 description: 0 for new post, >0 for edit
 *               postText:
 *                 type: string
 *               mediaUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Post created/updated successfully
 */
router.get('/', authenticateToken, async (req, res) => {
  const userEmail = req.user.email;
  const userId = req.user.id;

  try {
    if (!userEmail) {
      return res.status(400).json({
        success: false,
        error: 'User email not found in token'
      });
    }

    const pool = await getConnection();
    const request = pool.request();
    
    request.input('EmailId', sql.VarChar(50), userEmail);
    
    console.log('Fetching posts for user:', { userId, userEmail });
    
    const result = await request.execute('SP_ZY_GetPosts');
    
    console.log('Posts result:', result.recordset);
    
    res.json({
      success: true,
      posts: result.recordset || []
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch posts',
      details: error.message
    });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const { postId = 0, postText, mediaUrl } = req.body;
  const userId = req.user.id;
  const userEmail = req.user.email;

  try {
    if (!userId || !userEmail) {
      return res.status(400).json({
        success: false,
        error: 'User data not found in token'
      });
    }

    console.log('Creating/editing post for user:', { userId, userEmail, postId, postText });

    const pool = await getConnection();
    const request = pool.request();
    
    request.input('PostId', sql.Int, postId);
    request.input('UserId', sql.VarChar(50), userId.toString());
    request.input('PostText', sql.NVarChar(sql.MAX), postText);
    request.input('MediaUrl', sql.NVarChar(500), mediaUrl || null);
    
    const result = await request.execute('SP_ZY_CreateOrEditPost');
    const postResult = result.recordset[0];
    
    console.log('Post creation result:', postResult);
    
    res.json({
      success: true,
      postId: postResult.PostId,
      message: postResult.Message
    });
  } catch (error) {
    console.error('Post creation/edit error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create/edit post',
      details: error.message
    });
  }
});

// Delete Post
router.delete('/:postId', authenticateToken, async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.id;
  
  try {
    const pool = await getConnection();
    const request = pool.request();
    
    request.input('PostId', sql.Int, postId);
    request.input('UserId', sql.VarChar(50), userId.toString());
    
    const result = await request.execute('SP_ZY_DeletePost');
    
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

// Get Post Likes
router.get('/:postId/likes', authenticateToken, async (req, res) => {
  const { postId } = req.params;
  const currentUserId = req.user.id;
  
  try {
    const pool = await getConnection();
    const request = pool.request();
    
    request.input('PostId', sql.Int, postId);
    
    const result = await request.query(`
      SELECT UserId FROM ZY_tbl_PostLikes 
      WHERE PostId = @PostId
    `);
    
    const isLikedByCurrentUser = result.recordset.some(like => like.UserId.toString() === currentUserId.toString());
    
    res.json({
      success: true,
      likes: result.recordset,
      count: result.recordset.length,
      isLikedByCurrentUser,
      currentUserId
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Like/Unlike Post
router.post('/:postId/like', authenticateToken, async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.id;
  
  try {
    const pool = await getConnection();
    const request = pool.request();
    
    request.input('PostId', sql.Int, postId);
    request.input('UserId', sql.VarChar(50), userId.toString());
    
    await request.execute('SP_ZY_LikeUnlikePost');
    
    res.json({
      success: true,
      message: 'Like status updated'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;