const Transaction = require('../models/Transaction');
const Wallet = require('../models/Wallet');
const User = require('../models/User');

// 1. Effectuer un transfert entre utilisateurs
exports.transfer = async (req, res) => {
    try {
        const { receiverPhone, amount, description } = req.body;
        const senderId = req.userId;

        // Validation
        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Montant invalide' });
        }

        if (amount < 100) {
            return res.status(400).json({ message: 'Montant minimum: 100 FCFA' });
        }

        if (amount > 500000) {
            return res.status(400).json({ message: 'Montant maximum: 500 000 FCFA par transaction' });
        }

        // Trouver le destinataire
        const receiver = await User.findOne({ phone: receiverPhone });
        if (!receiver) {
            return res.status(404).json({ message: 'Bénéficiaire non trouvé' });
        }

        // Vérifier que l'utilisateur ne s'envoie pas d'argent à lui-même
        if (senderId === receiver._id.toString()) {
            return res.status(400).json({ message: 'Transfert à soi-même non autorisé' });
        }

        // Récupérer les wallets
        const senderWallet = await Wallet.findOne({ userId: senderId });
        const receiverWallet = await Wallet.findOne({ userId: receiver._id });

        if (!senderWallet || !receiverWallet) {
            return res.status(404).json({ message: 'Portefeuille non trouvé' });
        }

        // Débiter l'expéditeur
        await senderWallet.debit(amount);

        // Créditer le destinataire
        await receiverWallet.credit(amount);

        // Créer la transaction
        const transaction = new Transaction({
            senderId,
            receiverId: receiver._id,
            amount,
            type: 'transfer',
            description: description || `Transfert à ${receiver.fullName}`,
            status: 'completed'
        });
        await transaction.save();
        // Emit real-time event
        try {
            const io = req.app.get('io');
            const payload = {
                id: transaction._id,
                reference: transaction.reference,
                amount,
                type: 'credit',
                title: receiver.fullName,
                subtitle: 'Reçu',
                date: transaction.createdAt,
                senderId,
                receiverId: receiver._id
            };
            if (io) {
                // notify receiver
                io.to(`user:${receiver._id}`).emit('transaction', payload);
                // notify sender
                io.to(`user:${senderId}`).emit('transaction', { ...payload, type: 'debit', amount: -amount });
            }
        } catch (e) {
            console.error('Socket emit error', e);
        }

        res.json({
            message: 'Transfert effectué avec succès',
            transaction: {
                id: transaction._id,
                reference: transaction.reference,
                amount,
                receiver: receiver.fullName,
                receiverPhone: receiver.phone,
                date: transaction.createdAt
            },
            newBalance: senderWallet.balance
        });
    } catch (error) {
        console.error(error);
        const message = error.message === 'Solde insuffisant'
            ? 'Solde insuffisant pour effectuer ce transfert'
            : error.message === 'Limite quotidienne dépassée'
                ? 'Limite quotidienne de transfert dépassée'
                : 'Erreur lors du transfert';
        res.status(400).json({ message });
    }
};

// 2. Payer un service (ISAGO, CANAL+, EDM, etc.)
exports.payService = async (req, res) => {
    try {
        const { service, amount, reference, customerName, customerId } = req.body;
        const userId = req.userId;

        // Liste des services disponibles
        const services = ['ISAGO', 'CANAL+', 'EDM', 'EAU', 'INTERNET', 'PHARMACY'];
        if (!services.includes(service)) {
            return res.status(400).json({ message: 'Service non disponible' });
        }

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Montant invalide' });
        }

        // Vérifier le montant minimum selon le service
        const minAmounts = {
            'ISAGO': 250000,
            'CANAL+': 10000,
            'EDM': 1000,
            'EAU': 1000,
            'INTERNET': 5000,
            'PHARMACY': 500
        };

        if (amount < (minAmounts[service] || 100)) {
            return res.status(400).json({
                message: `Montant minimum pour ${service}: ${minAmounts[service]?.toLocaleString('fr-FR') || 100} FCFA`
            });
        }

        // Récupérer le wallet
        const wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            return res.status(404).json({ message: 'Portefeuille non trouvé' });
        }

        // Débiter le wallet
        await wallet.debit(amount);

        // Créer la transaction
        const transaction = new Transaction({
            senderId: userId,
            receiverId: userId,
            amount,
            type: 'payment',
            service,
            serviceReference: reference || customerId,
            description: `Paiement ${service}${customerName ? ` - ${customerName}` : ''}`,
            status: 'completed'
        });
        await transaction.save();

        // Emit event to user
        try {
            const io = req.app.get('io');
            const payload = {
                id: transaction._id,
                reference: transaction.reference,
                amount,
                type: 'debit',
                title: `Paiement ${service}`,
                subtitle: 'Paiement',
                service,
                date: transaction.createdAt,
                userId
            };
            if (io) io.to(`user:${userId}`).emit('transaction', payload);
        } catch (e) {
            console.error('Socket emit error', e);
        }

        res.json({
            message: `Paiement ${service} effectué avec succès`,
            transaction: {
                id: transaction._id,
                reference: transaction.reference,
                amount,
                service,
                serviceReference: reference || customerId,
                customerName,
                date: transaction.createdAt
            },
            newBalance: wallet.balance
        });
    } catch (error) {
        console.error(error);
        const message = error.message === 'Solde insuffisant'
            ? 'Solde insuffisant pour effectuer ce paiement'
            : 'Erreur lors du paiement';
        res.status(400).json({ message });
    }
};

// 3. Récupérer l'historique des transactions
exports.getHistory = async (req, res) => {
    try {
        const userId = req.userId;
        const { limit = 50, page = 1, type = 'all' } = req.query;

        const query = {
            $or: [
                { senderId: userId },
                { receiverId: userId }
            ]
        };

        if (type !== 'all') {
            query.type = type;
        }

        const transactions = await Transaction.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .populate('senderId', 'firstName lastName phone')
            .populate('receiverId', 'firstName lastName phone');

        const total = await Transaction.countDocuments(query);

        // Formater les transactions pour le frontend
        const formattedTransactions = transactions.map(tx => {
            const isCredit = tx.receiverId._id.toString() === userId;
            const otherParty = isCredit ? tx.senderId : tx.receiverId;

            return {
                id: tx._id,
                reference: tx.reference,
                title: otherParty?.fullName || (tx.service || 'Transaction'),
                subtitle: isCredit ? 'Reçu' : (tx.service ? `Paiement ${tx.service}` : 'Envoyé'),
                amount: isCredit ? tx.amount : -tx.amount,
                type: isCredit ? 'credit' : 'debit',
                service: tx.service,
                date: tx.createdAt,
                status: tx.status
            };
        });

        res.json({
            transactions: formattedTransactions,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de la récupération de l\'historique' });
    }
};

// 4. Récupérer les détails d'une transaction
exports.getTransactionDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        const transaction = await Transaction.findById(id)
            .populate('senderId', 'firstName lastName phone')
            .populate('receiverId', 'firstName lastName phone');

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction non trouvée' });
        }

        const isCredit = transaction.receiverId._id.toString() === userId;
        const otherParty = isCredit ? transaction.senderId : transaction.receiverId;

        res.json({
            id: transaction._id,
            reference: transaction.reference,
            amount: transaction.amount,
            type: isCredit ? 'credit' : 'debit',
            service: transaction.service,
            serviceReference: transaction.serviceReference,
            description: transaction.description,
            status: transaction.status,
            fees: transaction.fees,
            otherParty: {
                id: otherParty._id,
                name: otherParty.fullName,
                phone: otherParty.phone
            },
            date: transaction.createdAt
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de la récupération des détails' });
    }
};

// 5. Récupérer les statistiques
exports.getStats = async (req, res) => {
    try {
        const userId = req.userId;

        // Total des crédits et débits
        const credits = await Transaction.aggregate([
            { $match: { receiverId: userId, status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const debits = await Transaction.aggregate([
            { $match: { senderId: userId, status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        // Nombre de transactions par mois
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlyStats = await Transaction.aggregate([
            {
                $match: {
                    $or: [{ senderId: userId }, { receiverId: userId }],
                    createdAt: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
                    count: { $sum: 1 },
                    total: { $sum: '$amount' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        res.json({
            totalReceived: credits[0]?.total || 0,
            totalSent: debits[0]?.total || 0,
            monthlyStats: monthlyStats.map(stat => ({
                month: stat._id.month,
                year: stat._id.year,
                count: stat.count,
                total: stat.total
            }))
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de la récupération des statistiques' });
    }
};
