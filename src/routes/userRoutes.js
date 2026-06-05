const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

// Toutes les routes nécessitent authentification
router.use(authMiddleware);

router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.get('/beneficiaries', userController.getBeneficiaries);
router.get('/search', userController.searchUser);
router.post('/register-device', userController.registerDevice);

module.exports = router;
