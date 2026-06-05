const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const authMiddleware = require('../middleware/auth');

// Toutes les routes nécessitent authentification
router.use(authMiddleware);

router.get('/balance', walletController.getBalance);
router.post('/deposit', walletController.deposit);
router.get('/qr-code', walletController.generateQRCode);
router.post('/scan-pay', walletController.scanAndPay);

module.exports = router;
