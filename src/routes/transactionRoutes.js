const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const authMiddleware = require('../middleware/auth');

// Toutes les routes nécessitent authentification
router.use(authMiddleware);

router.post('/transfer', transactionController.transfer);
router.post('/pay-service', transactionController.payService);
router.get('/history', transactionController.getHistory);
router.get('/stats', transactionController.getStats);
router.get('/transaction/:id', transactionController.getTransactionDetails);

module.exports = router;
