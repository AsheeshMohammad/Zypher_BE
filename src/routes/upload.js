import express from "express";
import { exec } from "child_process";
import { promisify } from "util";
import sql from "mssql";
import { getConnection } from "../config/database.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();
const execAsync = promisify(exec);

const BUCKET_NAME = "zypherv1";
const SERVICE_ACCOUNT_EMAIL = process.env.GCS_SERVICE_ACCOUNT_EMAIL;

// Get signed URL for Google Cloud upload
router.post("/upload-photo", authenticateToken, async (req, res) => {
  const { fileName, contentType, photoType } = req.body;
  const userId = req.userClaims.id;

  if (!["PROFILE", "COVER"].includes(photoType)) {
    return res.status(400).json({ success: false, error: "Invalid photo type" });
  }

  try {
    const objectName = `users/${userId}/${photoType.toLowerCase()}/${Date.now()}_${fileName}`;
    const command = `gcloud storage sign-url gs://${BUCKET_NAME}/${objectName} --impersonate-service-account=${SERVICE_ACCOUNT_EMAIL} --http-verb=PUT --duration=10m --headers=content-type=${contentType}`;
    
    console.log('EXACT COMMAND:', command);
    console.log('CONTENT TYPE:', contentType);
    
    const { stdout } = await execAsync(command);
    console.log('Gcloud output:', stdout);
    
    // Extract only the signed URL from the output
    const lines = stdout.trim().split('\n');
    const signedUrlLine = lines.find(line => line.includes('https://'));
    const signedUrl = signedUrlLine ? signedUrlLine.replace(/^.*https:/, 'https:').trim() : stdout.trim();
    
    console.log('Extracted signed URL:', signedUrl);
    const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${objectName}`;

    res.json({
      success: true,
      signedUrl,
      publicUrl
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Save photo after successful GCS upload
router.post("/save-photo-after-upload", authenticateToken, async (req, res) => {
  const { photoType, photoUrl } = req.body;
  const userId = req.userClaims.id;

  try {
    const pool = await getConnection();
    const request = pool.request();

    request.input("UserId", sql.Int, userId);
    request.input("PhotoType", sql.VarChar(20), photoType);
    request.input("PhotoUrl", sql.VarChar(sql.MAX), photoUrl);

    const result = await request.execute("SP_ZY_UploadUserPhotos");

    res.json({
      success: true,
      message: result.recordset[0]?.Message || "Photo saved",
      photoUrl
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Save photo URL to database
router.post("/save-photo", authenticateToken, async (req, res) => {
  const { photoType, photoUrl } = req.body;
  const userId = req.userClaims.id;

  console.log('Save photo request:', { userId, photoType, photoUrl });

  try {
    const pool = await getConnection();
    const request = pool.request();

    request.input("UserId", sql.Int, userId);
    request.input("PhotoType", sql.VarChar(20), photoType);
    request.input("PhotoUrl", sql.VarChar(sql.MAX), photoUrl);

    console.log('Calling SP_ZY_UploadUserPhotos');
    const result = await request.execute("SP_ZY_UploadUserPhotos");
    console.log('SP result:', result.recordset);

    res.json({
      success: true,
      message: result.recordset[0]?.Message || 'Photo saved',
    });
  } catch (error) {
    console.error('Save photo error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user photos
router.get("/photos/:userId", authenticateToken, async (req, res) => {
  const { userId } = req.params;

  try {
    const pool = await getConnection();
    const request = pool.request();

    request.input("UserId", sql.Int, userId);

    const result = await request.query(`
      SELECT PhotoType, PhotoUrl, UploadedOn
      FROM ZY_UserPhotos 
      WHERE UserId = @UserId AND IsActive = 1
    `);

    const photos = {};
    result.recordset.forEach((photo) => {
      photos[photo.PhotoType.toLowerCase()] = photo.PhotoUrl;
    });

    res.json({ success: true, photos });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user full profile
router.get("/profile/:userId", authenticateToken, async (req, res) => {
  const { userId } = req.params;

  try {
    const pool = await getConnection();
    const request = pool.request();

    request.input("UserId", sql.Int, userId);

    const result = await request.execute("SP_ZY_GetUserFullProfile");

    const profile = {
      user: result.recordsets[0][0] || null,
      profilePhoto: result.recordsets[1][0] || null,
      coverPhoto: result.recordsets[2][0] || null,
      experiences: result.recordsets[3] || [],
    };

    res.json({ success: true, profile });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});



// Post photo upload
router.post("/photo", authenticateToken, async (req, res) => {
  const { fileName, contentType, type = "POST" } = req.body;
  const userId = req.userClaims.id;

  try {
    const objectName = `posts/${userId}/${Date.now()}_${fileName}`;
    const command = `gcloud storage sign-url gs://${BUCKET_NAME}/${objectName} --impersonate-service-account=${SERVICE_ACCOUNT_EMAIL} --http-verb=PUT --duration=10m --headers=content-type=${contentType}`;
    
    const { stdout } = await execAsync(command);
    const lines = stdout.trim().split('\n');
    const signedUrlLine = lines.find(line => line.includes('https://'));
    const signedUrl = signedUrlLine ? signedUrlLine.replace(/^.*https:/, 'https:').trim() : stdout.trim();
    
    const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${objectName}`;

    res.json({
      success: true,
      signedUrl,
      publicUrl,
      photoUrl: publicUrl
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generic file upload for attachments
router.post("/file", authenticateToken, async (req, res) => {
  const { fileName, contentType, fileType = "attachment" } = req.body;
  const userId = req.userClaims.id;

  try {
    const objectName = `files/${userId}/${fileType}/${Date.now()}_${fileName}`;

    const command = `gcloud storage sign-url gs://${BUCKET_NAME}/${objectName} --impersonate-service-account=${SERVICE_ACCOUNT_EMAIL} --http-verb=PUT --duration=10m --headers=content-type=${contentType}`;

    console.log('FILE EXACT COMMAND:', command);
    console.log('FILE CONTENT TYPE:', contentType);

    const { stdout } = await execAsync(command);
    console.log('File gcloud output:', stdout);
    
    // Extract only the signed URL from the output
    const lines = stdout.trim().split('\n');
    const signedUrlLine = lines.find(line => line.includes('https://'));
    const signedUrl = signedUrlLine ? signedUrlLine.replace(/^.*https:/, 'https:').trim() : stdout.trim();

    res.json({
      success: true,
      signedUrl,
      objectName,
      publicUrl: `https://storage.googleapis.com/${BUCKET_NAME}/${objectName}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
