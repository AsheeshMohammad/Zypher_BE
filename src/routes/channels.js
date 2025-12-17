import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { getConnection } from '../config/database.js';
import sql from 'mssql';

const router = express.Router();

/**
 * @swagger
 * /api/channels:
 *   post:
 *     summary: Create a new channel
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - channelName
 *             properties:
 *               channelName:
 *                 type: string
 *                 description: Name of the channel
 *               description:
 *                 type: string
 *                 description: Description of the channel
 *               isPublic:
 *                 type: boolean
 *                 description: Whether the channel is public
 *               channelType:
 *                 type: string
 *                 enum: [public, private, announcement]
 *                 description: Type of the channel
 *     responses:
 *       201:
 *         description: Channel created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { channelName, description, isPublic = true, channelType = 'public' } = req.body;
    const userId = req.userClaims.id;

    if (!channelName || channelName.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Channel name is required'
      });
    }

    const pool = await getConnection();
    const result = await pool.request()
      .input('ChannelName', sql.NVarChar, channelName.trim())
      .input('Description', sql.NVarChar, description?.trim() || null)
      .input('CreatedBy', sql.Int, userId)
      .input('IsPublic', sql.Bit, isPublic)
      .input('ChannelType', sql.NVarChar, channelType)
      .execute('SP_ZY_CreateChannel');

    const { Success, Message, ChannelId } = result.recordset[0];

    if (Success) {
      res.status(201).json({
        success: true,
        message: Message,
        data: { channelId: ChannelId }
      });
    } else {
      res.status(400).json({
        success: false,
        message: Message
      });
    }
  } catch (error) {
    console.error('Error creating channel:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/channels:
 *   get:
 *     summary: Get all channels
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of channels
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       channelId:
 *                         type: number
 *                       channelName:
 *                         type: string
 *                       description:
 *                         type: string
 *                       createdBy:
 *                         type: number
 *                       createdByName:
 *                         type: string
 *                       createdDate:
 *                         type: string
 *                         format: date-time
 *                       isPublic:
 *                         type: boolean
 *                       channelType:
 *                         type: string
 *                       followerCount:
 *                         type: number
 *                       isFollowing:
 *                         type: boolean
 *       500:
 *         description: Server error
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.userClaims.id;
    const pool = await getConnection();
    const result = await pool.request()
      .input('UserId', sql.Int, userId)
      .execute('SP_ZY_GetChannels');

    res.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('Error getting channels:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/channels/{id}:
 *   get:
 *     summary: Get channel by ID
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Channel ID
 *     responses:
 *       200:
 *         description: Channel details
 *       404:
 *         description: Channel not found
 *       500:
 *         description: Server error
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userClaims.id;

    const pool = await getConnection();
    const result = await pool.request()
      .input('ChannelId', sql.Int, id)
      .input('UserId', sql.Int, userId)
      .execute('SP_ZY_GetChannelById');

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found'
      });
    }

    res.json({
      success: true,
      data: result.recordset[0]
    });
  } catch (error) {
    console.error('Error getting channel:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/channels/{id}:
 *   put:
 *     summary: Update channel
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Channel ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - channelName
 *             properties:
 *               channelName:
 *                 type: string
 *               description:
 *                 type: string
 *               isPublic:
 *                 type: boolean
 *               channelType:
 *                 type: string
 *                 enum: [public, private, announcement]
 *     responses:
 *       200:
 *         description: Channel updated successfully
 *       403:
 *         description: Forbidden - not the channel creator
 *       500:
 *         description: Server error
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { channelName, description, isPublic, channelType } = req.body;
    const userId = req.userClaims.id;

    if (!channelName || channelName.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Channel name is required'
      });
    }

    const pool = await getConnection();
    const result = await pool.request()
      .input('ChannelId', sql.Int, id)
      .input('ChannelName', sql.NVarChar, channelName.trim())
      .input('Description', sql.NVarChar, description?.trim() || null)
      .input('IsPublic', sql.Bit, isPublic)
      .input('ChannelType', sql.NVarChar, channelType)
      .execute('SP_ZY_UpdateChannel');

    const { Success, Message } = result.recordset[0];

    if (Success) {
      res.json({
        success: true,
        message: Message
      });
    } else {
      res.status(403).json({
        success: false,
        message: Message
      });
    }
  } catch (error) {
    console.error('Error updating channel:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/channels/{id}/follow:
 *   post:
 *     summary: Follow a channel
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Channel ID
 *     responses:
 *       200:
 *         description: Channel followed successfully
 *       500:
 *         description: Server error
 */
router.post('/:id/follow', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userClaims.id;

    const pool = await getConnection();
    const result = await pool.request()
      .input('ChannelId', sql.Int, id)
      .input('UserId', sql.Int, userId)
      .execute('SP_ZY_FollowChannel');

    const { Success, Message } = result.recordset[0];

    if (Success) {
      res.json({
        success: true,
        message: Message
      });
    } else {
      res.status(400).json({
        success: false,
        message: Message
      });
    }
  } catch (error) {
    console.error('Error following channel:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/channels/{id}/unfollow:
 *   post:
 *     summary: Unfollow a channel
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Channel ID
 *     responses:
 *       200:
 *         description: Channel unfollowed successfully
 *       500:
 *         description: Server error
 */
router.post('/:id/unfollow', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userClaims.id;

    const pool = await getConnection();
    const result = await pool.request()
      .input('ChannelId', sql.Int, id)
      .input('UserId', sql.Int, userId)
      .execute('SP_ZY_UnfollowChannel');

    const { Success, Message } = result.recordset[0];

    if (Success) {
      res.json({
        success: true,
        message: Message
      });
    } else {
      res.status(400).json({
        success: false,
        message: Message
      });
    }
  } catch (error) {
    console.error('Error unfollowing channel:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/channels/{id}/messages:
 *   post:
 *     summary: Send a message to a channel
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Channel ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - messageText
 *             properties:
 *               messageText:
 *                 type: string
 *                 description: The message content
 *               parentMessageId:
 *                 type: integer
 *                 description: ID of parent message for threaded replies
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       400:
 *         description: Bad request
 *       403:
 *         description: Forbidden - not following the channel
 *       500:
 *         description: Server error
 */
router.post('/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { messageText, parentMessageId } = req.body;
    const userId = req.userClaims.id;

    if (!messageText || messageText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message text is required'
      });
    }

    const pool = await getConnection();
    const result = await pool.request()
      .input('ChannelId', sql.Int, id)
      .input('UserId', sql.Int, userId)
      .input('MessageText', sql.NVarChar, messageText.trim())
      .input('ParentMessageId', sql.Int, parentMessageId || null)
      .execute('SP_ZY_SendChannelMessage');

    const { Success, Message, MessageId } = result.recordset[0];

    if (Success) {
      res.status(201).json({
        success: true,
        message: Message,
        data: { messageId: MessageId }
      });
    } else {
      res.status(403).json({
        success: false,
        message: Message
      });
    }
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/channels/{id}/messages:
 *   get:
 *     summary: Get messages from a channel
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Channel ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of messages per page
 *     responses:
 *       200:
 *         description: List of messages
 *       403:
 *         description: Forbidden - not following the channel
 *       500:
 *         description: Server error
 */
router.get('/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.userClaims.id;

    const pool = await getConnection();
    const result = await pool.request()
      .input('ChannelId', sql.Int, id)
      .input('UserId', sql.Int, userId)
      .input('PageNumber', sql.Int, parseInt(page))
      .input('PageSize', sql.Int, parseInt(limit))
      .execute('SP_ZY_GetChannelMessages');

    // Check if it's an error response
    if (result.recordset.length > 0 && result.recordset[0].Success === 0) {
      return res.status(403).json({
        success: false,
        message: result.recordset[0].Message
      });
    }

    res.json({
      success: true,
      data: result.recordset,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/channels/{id}:
 *   delete:
 *     summary: Delete a channel (soft delete)
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Channel ID
 *     responses:
 *       200:
 *         description: Channel deleted successfully
 *       403:
 *         description: Forbidden - not the channel creator
 *       500:
 *         description: Server error
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userClaims.id;

    const pool = await getConnection();
    const result = await pool.request()
      .input('ChannelId', sql.Int, id)
      .input('UserId', sql.Int, userId)
      .execute('SP_ZY_DeleteChannel');

    const { Success, Message } = result.recordset[0];

    if (Success) {
      res.json({
        success: true,
        message: Message
      });
    } else {
      res.status(403).json({
        success: false,
        message: Message
      });
    }
  } catch (error) {
    console.error('Error deleting channel:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /api/channels/followed:
 *   get:
 *     summary: Get channels followed by the current user
 *     tags: [Channels]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of followed channels
 *       500:
 *         description: Server error
 */
router.get('/followed', authenticateToken, async (req, res) => {
  try {
    const userId = req.userClaims.id;

    const pool = await getConnection();
    const result = await pool.request()
      .input('UserId', sql.Int, userId)
      .execute('SP_ZY_GetUserFollowedChannels');

    res.json({
      success: true,
      data: result.recordset
    });
  } catch (error) {
    console.error('Error getting followed channels:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;