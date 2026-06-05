const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');

// 1. Récupérer le profil utilisateur
exports.getProfile = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await User.findById(userId).select('-__v');
        const wallet = await Wallet.findOne({ userId });

        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        res.json({
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: user.fullName,
            phone: user.phone,
            email: user.email,
            avatar: user.avatar,
            isVerified: user.isVerified,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt,
            wallet: {
                balance: wallet?.balance || 0,
                currency: wallet?.currency || 'XOF'
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de la récupération du profil' });
    }
};

// 2. Mettre à jour le profil
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.userId;
        const { firstName, lastName, email } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur non trouvé' });
        }

        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (email) {
            // Vérifier si l'email n'est pas déjà utilisé
            const existingUser = await User.findOne({ email, _id: { $ne: userId } });
            if (existingUser) {
                return res.status(400).json({ message: 'Cet email est déjà utilisé' });
            }
            user.email = email;
        }

        user.updatedAt = Date.now();
        await user.save();

        res.json({
            message: 'Profil mis à jour avec succès',
            user: {
                firstName: user.firstName,
                lastName: user.lastName,
                fullName: user.fullName,
                email: user.email
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de la mise à jour du profil' });
    }
};

// 3. Récupérer les bénéficiaires fréquents
exports.getBeneficiaries = async (req, res) => {
    try {
        const userId = req.userId;

        // Trouver les transactions vers d'autres utilisateurs
        const transactions = await Transaction.find({
            senderId: userId,
            receiverId: { $ne: userId }
        })
            .populate('receiverId', 'firstName lastName phone avatar')
            .sort({ createdAt: -1 });

        // Regrouper par bénéficiaire
        const beneficiariesMap = new Map();

        for (const tx of transactions) {
            const receiver = tx.receiverId;
            if (!receiver) continue;

            const key = receiver._id.toString();

            if (!beneficiariesMap.has(key)) {
                beneficiariesMap.set(key, {
                    id: receiver._id,
                    name: receiver.fullName,
                    phone: receiver.phone,
                    avatar: receiver.avatar,
                    count: 0,
                    totalAmount: 0,
                    lastAmount: 0,
                    lastTransfer: tx.createdAt
                });
            }

            const ben = beneficiariesMap.get(key);
            ben.count += 1;
            ben.totalAmount += tx.amount;
            ben.lastAmount = tx.amount;
            if (tx.createdAt > ben.lastTransfer) {
                ben.lastTransfer = tx.createdAt;
            }
        }

        const beneficiaries = Array.from(beneficiariesMap.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        res.json({ beneficiaries });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de la récupération des bénéficiaires' });
    }
};

// 4. Rechercher un utilisateur par numéro
exports.searchUser = async (req, res) => {
    try {
        const { phone } = req.query;
        const userId = req.userId;

        if (!phone || phone.length !== 8) {
            return res.status(400).json({ message: 'Numéro invalide (8 chiffres requis)' });
        }

        const user = await User.findOne({ phone }).select('firstName lastName phone avatar');

        if (!user) {
            return res.status(404).json({ message: 'Aucun utilisateur trouvé avec ce numéro' });
        }

        // Ne pas retourner l'utilisateur lui-même
        if (user._id.toString() === userId) {
            return res.status(400).json({ message: 'Vous ne pouvez pas vous ajouter vous-même' });
        }

        res.json({
            id: user._id,
            name: user.fullName,
            phone: user.phone,
            avatar: user.avatar
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de la recherche' });
    }
};

// 5. Ajouter un appareil pour notifications push
exports.registerDevice = async (req, res) => {
    try {
        const userId = req.userId;
        const { deviceToken, platform } = req.body;

        if (!deviceToken) {
            return res.status(400).json({ message: 'Token appareil requis' });
        }

        await User.findByIdAndUpdate(userId, { deviceToken });

        res.json({ message: 'Appareil enregistré pour les notifications' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de l\'enregistrement' });
    }
};
