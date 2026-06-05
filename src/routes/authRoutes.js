const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// Routes publiques
router.post('/request-otp', authController.requestOTP);
router.post('/verify-otp', authController.verifyOTP);

// Routes protégées (nécessitent authentification)
router.post('/logout', authMiddleware, authController.logout);

module.exports = router;
