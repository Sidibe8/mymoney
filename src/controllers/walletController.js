const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

// 1. Récupérer le solde
exports.getBalance = async (req, res) => {
    try {
        const userId = req.userId;
        const wallet = await Wallet.findOne({ userId });

        if (!wallet) {
            return res.status(404).json({ message: 'Portefeuille non trouvé' });
        }

        await wallet.resetDailyLimit();

        res.json({
            balance: wallet.balance,
            currency: wallet.currency,
            dailyLimit: wallet.dailyLimit,
            dailySpent: wallet.dailySpent,
            remainingDailyLimit: wallet.dailyLimit - wallet.dailySpent
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de la récupération du solde' });
    }
};

// 2. Recharger le compte (simulation)
exports.deposit = async (req, res) => {
    try {
        const { amount, method = 'orange_money' } = req.body;
        const userId = req.userId;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Montant invalide' });
        }

        if (amount < 100) {
            return res.status(400).json({ message: 'Montant minimum: 100 FCFA' });
        }

        if (amount > 500000) {
            return res.status(400).json({ message: 'Montant maximum: 500 000 FCFA par transaction' });
        }

        const wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            return res.status(404).json({ message: 'Portefeuille non trouvé' });
        }

        await wallet.credit(amount);

        // Créer une transaction de dépôt
        const transaction = new Transaction({
            senderId: userId,
            receiverId: userId,
            amount,
            type: 'deposit',
            description: `Dépôt via ${method}`,
            status: 'completed'
        });
        await transaction.save();

        res.json({
            message: `Dépôt de ${amount.toLocaleString('fr-FR')} FCFA effectué`,
            newBalance: wallet.balance,
            transactionReference: transaction.reference
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors du dépôt' });
    }
};

// 3. Générer QR code pour le wallet
exports.generateQRCode = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await User.findById(userId);
        const wallet = await Wallet.findOne({ userId });

        if (!user || !wallet) {
            return res.status(404).json({ message: 'Utilisateur ou portefeuille non trouvé' });
        }

        // Données du QR code
        const qrData = {
            type: 'payment_request',
            userId: user._id.toString(),
            phone: user.phone,
            name: user.fullName,
            amount: null // Sera défini par le payeur
        };

        res.json({
            qrData: JSON.stringify(qrData),
            phone: user.phone,
            name: user.fullName,
            balance: wallet.balance
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de la génération du QR code' });
    }
};

// 4. Scanner et payer par QR code
exports.scanAndPay = async (req, res) => {
    try {
        const { qrData, amount, description } = req.body;
        const senderId = req.userId;

        if (!qrData) {
            return res.status(400).json({ message: 'Données QR code invalides' });
        }

        let receiverData;
        try {
            receiverData = JSON.parse(qrData);
        } catch (e) {
            return res.status(400).json({ message: 'QR code invalide' });
        }

        if (!receiverData.userId || !amount || amount <= 0) {
            return res.status(400).json({ message: 'Données de paiement invalides' });
        }

        const receiver = await User.findById(receiverData.userId);
        if (!receiver) {
            return res.status(404).json({ message: 'Bénéficiaire non trouvé' });
        }

        if (senderId === receiver._id.toString()) {
            return res.status(400).json({ message: 'Paiement à soi-même non autorisé' });
        }

        const senderWallet = await Wallet.findOne({ userId: senderId });
        const receiverWallet = await Wallet.findOne({ userId: receiver._id });

        if (!senderWallet || !receiverWallet) {
            return res.status(404).json({ message: 'Portefeuille non trouvé' });
        }

        await senderWallet.debit(amount);
        await receiverWallet.credit(amount);

        const transaction = new Transaction({
            senderId,
            receiverId: receiver._id,
            amount,
            type: 'payment',
            description: description || `Paiement à ${receiver.fullName} via QR code`,
            status: 'completed'
        });
        await transaction.save();

        res.json({
            message: `Paiement de ${amount.toLocaleString('fr-FR')} FCFA effectué`,
            receiver: receiver.fullName,
            newBalance: senderWallet.balance,
            transactionReference: transaction.reference
        });
    } catch (error) {
        console.error(error);
        const message = error.message === 'Solde insuffisant'
            ? 'Solde insuffisant pour effectuer ce paiement'
            : 'Erreur lors du paiement';
        res.status(400).json({ message });
    }
};
