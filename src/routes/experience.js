import express from 'express';
import sql from 'mssql';
import { getConnection } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Add or Edit Experience
router.post('/', authenticateToken, async (req, res) => {
  const { experienceId = 0, companyName, roleName, startDate, endDate, description } = req.body;
  const userId = req.userClaims.id;
  
  try {
    const pool = await getConnection();
    const request = pool.request();
    
    request.input('ExperienceId', sql.Int, experienceId);
    request.input('UserId', sql.Int, userId);
    request.input('CompanyName', sql.NVarChar(200), companyName);
    request.input('RoleName', sql.NVarChar(200), roleName);
    request.input('StartDate', sql.Date, startDate);
    request.input('EndDate', sql.Date, endDate || null);
    request.input('Description', sql.NVarChar(sql.MAX), description);
    
    const result = await request.execute('SP_ZY_AddEditExperience');
    
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

// Get User Experiences
router.get('/:userId', authenticateToken, async (req, res) => {
  const { userId } = req.params;
  
  try {
    const pool = await getConnection();
    const request = pool.request();
    
    request.input('UserId', sql.Int, userId);
    
    request.input('UserId', sql.Int, userId);
    
    const result = await request.execute('SP_ZY_GetUserExperiences');
    
    res.json({
      success: true,
      experiences: result.recordset
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Delete Experience
router.delete('/:experienceId', authenticateToken, async (req, res) => {
  const { experienceId } = req.params;
  const userId = req.userClaims.id;
  
  try {
    const pool = await getConnection();
    const request = pool.request();
    
    request.input('ExperienceId', sql.Int, experienceId);
    request.input('UserId', sql.Int, userId);
    
    const result = await request.execute('SP_ZY_DeleteExperience');
    
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

export default router;