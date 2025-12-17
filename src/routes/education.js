import express from 'express';
import sql from 'mssql';
import { getConnection } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Add Education
router.post('/add', authenticateToken, async (req, res) => {
  const { school, degree, fieldOfStudy, startYear, endYear, activities } = req.body;
  const userId = req.user.id;

  try {
    if (!school || !degree) {
      return res.status(400).json({
        success: false,
        error: 'School and degree are required'
      });
    }

    const pool = await getConnection();
    const request = pool.request();
    
    request.input('UserId', sql.Int, userId);
    request.input('School', sql.NVarChar(200), school);
    request.input('Degree', sql.NVarChar(100), degree);
    request.input('FieldOfStudy', sql.NVarChar(100), fieldOfStudy || null);
    request.input('StartYear', sql.Int, startYear || null);
    request.input('EndYear', sql.Int, endYear || null);
    request.input('Activities', sql.NVarChar(500), activities || null);
    
    const result = await request.execute('SP_ZY_AddUserEducation');
    
    if (result.recordset[0].Success) {
      res.json({
        success: true,
        message: result.recordset[0].Message,
        educationId: result.recordset[0].EducationId
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.recordset[0].Message
      });
    }
  } catch (error) {
    console.error('Add education error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add education'
    });
  }
});

// Update Education
router.put('/update/:educationId', authenticateToken, async (req, res) => {
  const { educationId } = req.params;
  const { school, degree, fieldOfStudy, startYear, endYear, activities } = req.body;
  const userId = req.user.id;

  try {
    const pool = await getConnection();
    const request = pool.request();
    
    request.input('EducationId', sql.Int, educationId);
    request.input('UserId', sql.Int, userId);
    request.input('School', sql.NVarChar(200), school);
    request.input('Degree', sql.NVarChar(100), degree);
    request.input('FieldOfStudy', sql.NVarChar(100), fieldOfStudy || null);
    request.input('StartYear', sql.Int, startYear || null);
    request.input('EndYear', sql.Int, endYear || null);
    request.input('Activities', sql.NVarChar(500), activities || null);
    
    const result = await request.execute('SP_ZY_UpdateUserEducation');
    
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
    console.error('Update education error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update education'
    });
  }
});

// Get User Education
router.get('/user/:userId', authenticateToken, async (req, res) => {
  const { userId } = req.params;

  try {
    const pool = await getConnection();
    const request = pool.request();
    
    request.input('UserId', sql.Int, userId);
    
    const result = await request.execute('SP_ZY_GetUserEducation');
    
    res.json({
      success: true,
      education: result.recordset
    });
  } catch (error) {
    console.error('Get education error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get education'
    });
  }
});

// Delete Education
router.delete('/delete/:educationId', authenticateToken, async (req, res) => {
  const { educationId } = req.params;
  const userId = req.user.id;

  try {
    const pool = await getConnection();
    const request = pool.request();
    
    request.input('EducationId', sql.Int, educationId);
    request.input('UserId', sql.Int, userId);
    
    const result = await request.execute('SP_ZY_DeleteUserEducation');
    
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
    console.error('Delete education error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete education'
    });
  }
});

export default router;