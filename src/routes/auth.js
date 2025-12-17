import express from 'express';
import jwt from 'jsonwebtoken';
import sql from 'mssql';
import { getConnection } from '../config/database.js';

const router = express.Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const pool = await getConnection();
    const request = pool.request();
    
    request.input('UserName', sql.VarChar(50), email);
    request.input('Password', sql.VarChar(50), password);
    
    const result = await request.execute('SP_ZY_UserSignIn');
    
    console.log('Stored procedure result:', result);
    console.log('Recordset:', result.recordset);
    console.log('Recordset length:', result.recordset?.length);
    
    if (!result.recordset || result.recordset.length === 0) {
      return res.status(401).json({ 
        success: false,
        error: 'No results returned from stored procedure' 
      });
    }
    
    const loginResult = result.recordset[0];
    console.log('Login result:', loginResult);
    
    // Check if login was successful
    if (loginResult && loginResult.LoginSuccess === 1) {
      // Successful login - has UserId
      const userClaims = {
        id: loginResult.UserId,
        email,
        role: loginResult.Role || 'user',
        permissions: loginResult.Permissions ? loginResult.Permissions.split(',') : ['read'],
        firstName: loginResult.FirstName || firstName || '',
        lastName: loginResult.LastName || lastName || '',
        isActive: loginResult.IsActive || true,
        loginTime: new Date().toISOString()
      };
      
      const token = jwt.sign(
        userClaims,
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      res.json({
        success: true,
        token,
        user: userClaims
      });
    } else {
      // Failed login - has Message
      res.status(401).json({ 
        success: false,
        error: loginResult?.Message || 'Invalid username or password'
      });
    }
  } catch (error) {
    console.error('Login error details:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error number:', error.number);
    console.error('Error state:', error.state);
    console.error('Full error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Login failed', 
      details: error.message 
    });
  }
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: User registration
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               mobileNumber:
 *                 type: string
 *               address:
 *                 type: string
 *               presentAddress:
 *                 type: string
 *               pincode:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               country:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 */
router.post('/register', async (req, res) => {
  const { 
    email, 
    password, 
    firstName, 
    lastName,
    designation,
    mobileNumber,
    address,
    presentAddress,
    pincode,
    city,
    state,
    country
  } = req.body;
  
  try {
    // Validate required fields
    if (!email || !password || !firstName || !lastName || !designation || !mobileNumber || !address || !presentAddress || !pincode || !city || !state || !country) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }

    const pool = await getConnection();
    const request = pool.request();
    
    // Use the stored procedure for signup
    request.input('UserName', sql.VarChar(50), `${firstName} ${lastName}`);
    request.input('Password', sql.VarChar(50), password);
    request.input('EmailId', sql.VarChar(50), email);
    request.input('Designation', sql.VarChar(50), designation || null);
    request.input('MobileNumber', sql.BigInt, mobileNumber ? BigInt(mobileNumber) : null);
    request.input('Address', sql.VarChar(200), address || null);
    request.input('Present_Address', sql.VarChar(200), presentAddress || null);
    request.input('Pincode', sql.BigInt, pincode ? BigInt(pincode) : null);
    request.input('City', sql.VarChar(10), city || null);
    request.input('State', sql.VarChar(10), state || null);
    request.input('Country', sql.VarChar(10), country || null);
    
    const result = await request.execute('SP_ZY_UserSignUp');
    
    if (!result.recordset || result.recordset.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'Registration failed'
      });
    }

    const signupResult = result.recordset[0];
    
    if (signupResult.SignUpSuccess === 1) {
      // Create JWT token for the new user
      const userClaims = {
        id: signupResult.UserId,
        email,
        role: 'user',
        permissions: ['read'],
        firstName: firstName || '',
        lastName: lastName || '',
        isActive: true,
        loginTime: new Date().toISOString()
      };
      
      const token = jwt.sign(
        userClaims,
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      res.status(201).json({
        success: true,
        message: signupResult.Message,
        token,
        user: userClaims,
        isNewUser: true
      });
    } else {
      res.status(400).json({
        success: false,
        error: signupResult.Message || 'Registration failed'
      });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/auth/google-signin:
 *   post:
 *     summary: Google OAuth sign in - checks if user exists
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               name:
 *                 type: string
 *               picture:
 *                 type: string
 *               googleId:
 *                 type: string
 *     responses:
 *       200:
 *         description: User exists - proceed with login
 *       201:
 *         description: New user - proceed with signup
 */
router.post('/google-signin', async (req, res) => {
  const { email, name, picture, googleId } = req.body;
  
  try {
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const pool = await getConnection();
    const request = pool.request();
    
    // Check if user exists by email
    request.input('Email', sql.VarChar(50), email);
    const checkResult = await request.query(`
      SELECT Id, UserName, EmailId FROM [ZY_UserMaster] WHERE EmailId = @Email
    `);

    if (checkResult.recordset && checkResult.recordset.length > 0) {
      // User exists - return user data for direct signin
      const user = checkResult.recordset[0];
      
      const userClaims = {
        id: user.Id,
        email: user.EmailId,
        role: 'user',
        permissions: ['read'],
        firstName: name.split(' ')[0] || '',
        lastName: name.split(' ').slice(1).join(' ') || '',
        isActive: true,
        loginTime: new Date().toISOString()
      };
      
      const token = jwt.sign(
        userClaims,
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      res.status(200).json({
        success: true,
        userExists: true,
        message: 'User found - proceeding with login',
        token,
        user: userClaims,
        isNewUser: false
      });
    } else {
      // User doesn't exist - return signup data
      const nameParts = name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      res.status(201).json({
        success: true,
        userExists: false,
        message: 'User not found - proceed with signup',
        signupData: {
          email,
          firstName,
          lastName,
          picture,
          googleId
        }
      });
    }
  } catch (error) {
    console.error('Google signin check error:', error);
    res.status(500).json({
      success: false,
      error: 'Google signin check failed',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh JWT token
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *       401:
 *         description: Invalid or expired token
 */
router.post('/refresh', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    try {
      // Verify the current token (even if expired, we can still decode it)
      const decoded = jwt.decode(token);
      
      if (!decoded || !decoded.id) {
        return res.status(401).json({
          success: false,
          error: 'Invalid token'
        });
      }

      // Check if user still exists and is active
      const pool = await getConnection();
      const request = pool.request();
      request.input('UserId', sql.Int, decoded.id);
      
      const result = await request.query(`
        SELECT Id, UserName, EmailId FROM [ZY_UserMaster] 
        WHERE Id = @UserId AND IsActive = 1
      `);

      if (!result.recordset || result.recordset.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'User not found or inactive'
        });
      }

      const user = result.recordset[0];
      
      // Create new token with fresh expiration
      const userClaims = {
        id: user.Id,
        email: user.EmailId,
        role: decoded.role || 'user',
        permissions: decoded.permissions || ['read'],
        firstName: decoded.firstName || '',
        lastName: decoded.lastName || '',
        isActive: true,
        loginTime: new Date().toISOString()
      };
      
      const newToken = jwt.sign(
        userClaims,
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      res.json({
        success: true,
        token: newToken,
        user: userClaims
      });
      
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token format'
      });
    }
    
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Token refresh failed',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/auth/countries:
 *   get:
 *     summary: Get list of countries
 *     tags: [Location]
 */
router.get('/countries', async (req, res) => {
  try {
    const countries = [
      { code: 'IN', name: 'India' },
      { code: 'US', name: 'United States' },
      { code: 'GB', name: 'United Kingdom' },
      { code: 'CA', name: 'Canada' },
      { code: 'AU', name: 'Australia' }
    ];
    res.json({ success: true, countries });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/auth/states:
 *   get:
 *     summary: Get list of states for a country
 *     tags: [Location]
 */
router.get('/states/:countryCode', async (req, res) => {
  try {
    const { countryCode } = req.params;
    let states = [];
    
    if (countryCode === 'IN') {
      states = [
        { code: 'KA', name: 'Karnataka' },
        { code: 'MH', name: 'Maharashtra' },
        { code: 'TN', name: 'Tamil Nadu' },
        { code: 'DL', name: 'Delhi' },
        { code: 'UP', name: 'Uttar Pradesh' },
        { code: 'WB', name: 'West Bengal' },
        { code: 'GJ', name: 'Gujarat' },
        { code: 'RJ', name: 'Rajasthan' },
        { code: 'AP', name: 'Andhra Pradesh' },
        { code: 'TG', name: 'Telangana' }
      ];
    }
    
    res.json({ success: true, states });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/auth/cities:
 *   get:
 *     summary: Get list of cities for a state
 *     tags: [Location]
 */
router.get('/cities/:stateCode', async (req, res) => {
  try {
    const { stateCode } = req.params;
    let cities = [];
    
    if (stateCode === 'KA') {
      cities = [
        { name: 'Bangalore' },
        { name: 'Mysore' },
        { name: 'Hubli' },
        { name: 'Mangalore' },
        { name: 'Belgaum' }
      ];
    } else if (stateCode === 'MH') {
      cities = [
        { name: 'Mumbai' },
        { name: 'Pune' },
        { name: 'Nagpur' },
        { name: 'Nashik' },
        { name: 'Aurangabad' }
      ];
    }
    
    res.json({ success: true, cities });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/auth/degrees:
 *   get:
 *     summary: Get list of degree options
 *     tags: [Education]
 */
router.get('/degrees', async (req, res) => {
  try {
    const degrees = [
      'Bachelor of Arts (BA)',
      'Bachelor of Science (BS)',
      'Bachelor of Engineering (BE)',
      'Bachelor of Technology (BTech)',
      'Bachelor of Computer Applications (BCA)',
      'Bachelor of Business Administration (BBA)',
      'Master of Arts (MA)',
      'Master of Science (MS)',
      'Master of Engineering (ME)',
      'Master of Technology (MTech)',
      'Master of Computer Applications (MCA)',
      'Master of Business Administration (MBA)',
      'Doctor of Philosophy (PhD)',
      'Doctor of Medicine (MD)',
      'Juris Doctor (JD)',
      'Associate Degree',
      'Diploma',
      'Certificate',
      'Other'
    ];
    
    res.json({
      success: true,
      degrees
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch degrees'
    });
  }
});

/**
 * @swagger
 * /api/auth/skills:
 *   get:
 *     summary: Get list of skill options
 *     tags: [Skills]
 */
router.get('/skills', async (req, res) => {
  try {
    const skills = [
      'JavaScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Rust', 'Swift',
      'React', 'Angular', 'Vue.js', 'Node.js', 'Express.js', 'Django', 'Flask', 'Spring',
      'HTML', 'CSS', 'SASS', 'Bootstrap', 'Tailwind CSS', 'jQuery',
      'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'SQLite', 'Oracle',
      'AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'Jenkins',
      'Git', 'GitHub', 'GitLab', 'Bitbucket', 'SVN',
      'Photoshop', 'Illustrator', 'Figma', 'Sketch', 'Adobe XD',
      'Project Management', 'Agile', 'Scrum', 'Leadership', 'Communication',
      'Machine Learning', 'Data Science', 'AI', 'Deep Learning', 'TensorFlow',
      'Other'
    ];
    
    res.json({
      success: true,
      skills
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch skills'
    });
  }
});

export default router;