import express from 'express';
import sql from 'mssql';
import { getConnection } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Add Skill
router.post('/add', authenticateToken, async (req, res) => {
  const { skillName, proficiencyLevel } = req.body;
  const userId = req.user.id;

  try {
    if (!skillName) {
      return res.status(400).json({
        success: false,
        error: 'Skill name is required'
      });
    }

    const pool = await getConnection();
    const request = pool.request();
    
    request.input('UserId', sql.Int, userId);
    request.input('SkillName', sql.NVarChar(100), skillName);
    request.input('ProficiencyLevel', sql.NVarChar(20), proficiencyLevel || null);
    
    const result = await request.execute('SP_ZY_AddUserSkill');
    
    if (result.recordset[0].Success) {
      res.json({
        success: true,
        message: result.recordset[0].Message,
        skillId: result.recordset[0].SkillId
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.recordset[0].Message
      });
    }
  } catch (error) {
    console.error('Add skill error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add skill'
    });
  }
});

// Update Skill
router.put('/update/:skillId', authenticateToken, async (req, res) => {
  const { skillId } = req.params;
  const { skillName, proficiencyLevel } = req.body;
  const userId = req.user.id;

  try {
    const pool = await getConnection();
    const request = pool.request();
    
    request.input('SkillId', sql.Int, skillId);
    request.input('UserId', sql.Int, userId);
    request.input('SkillName', sql.NVarChar(100), skillName);
    request.input('ProficiencyLevel', sql.NVarChar(20), proficiencyLevel || null);
    
    const result = await request.execute('SP_ZY_UpdateUserSkill');
    
    if (result.recordset[0].Success) {
      res.json({
        success: true,
        message: result.recordset[0].Message
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.recordset[0].Message
      });
    }
  } catch (error) {
    console.error('Update skill error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update skill'
    });
  }
});

// Get User Skills
router.get('/user/:userId', authenticateToken, async (req, res) => {
  const { userId } = req.params;

  try {
    const pool = await getConnection();
    const request = pool.request();
    
    request.input('UserId', sql.Int, userId);
    
    const result = await request.execute('SP_ZY_GetUserSkills');
    
    res.json({
      success: true,
      skills: result.recordset
    });
  } catch (error) {
    console.error('Get skills error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get skills'
    });
  }
});

// Delete Skill
router.delete('/delete/:skillId', authenticateToken, async (req, res) => {
  const { skillId } = req.params;
  const userId = req.user.id;

  try {
    const pool = await getConnection();
    const request = pool.request();
    
    request.input('SkillId', sql.Int, skillId);
    request.input('UserId', sql.Int, userId);
    
    const result = await request.execute('SP_ZY_DeleteUserSkill');
    
    if (result.recordset[0].Success) {
      res.json({
        success: true,
        message: result.recordset[0].Message
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.recordset[0].Message
      });
    }
  } catch (error) {
    console.error('Delete skill error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete skill'
    });
  }
});

export default router;