const User = require('../models/User');
const Wallet = require('../models/Wallet');
const OTP = require('../models/OTP');
const jwt = require('jsonwebtoken');

// Générer un code OTP aléatoire (6 chiffres)
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Simuler l'envoi de SMS (pour la démo)
const simulateSendSMS = async (phone, code) => {
    console.log(`📱 SMS envoyé à +223${phone}: Code ${code}`);
    console.log(`🔑 Code de vérification: ${code}`);
    return true;
};

// 1. Demander un code OTP
exports.requestOTP = async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone || phone.length !== 8) {
            return res.status(400).json({
                message: 'Numéro invalide. Veuillez entrer 8 chiffres.'
            });
        }

        // Supprimer les anciens OTP
        await OTP.deleteMany({ phone });

        // Générer nouveau code
        const code = generateOTP();
        const expiresAt = new Date(Date.now() + (process.env.OTP_EXPIRY_MINUTES || 5) * 60 * 1000);

        // Sauvegarder l'OTP
        const otp = new OTP({ phone, code, expiresAt });
        await otp.save();

        // Simuler l'envoi de SMS
        if (process.env.SMS_SIMULATION === 'true') {
            await simulateSendSMS(phone, code);
        }

        res.json({
            message: 'Code envoyé avec succès',
            expiresIn: parseInt(process.env.OTP_EXPIRY_MINUTES || 5),
            demoCode: code // À enlever en production
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Erreur lors de l\'envoi du code'
        });
    }
};

// 2. Vérifier le code OTP et connecter/inscrire
exports.verifyOTP = async (req, res) => {
    try {
        const { phone, code, firstName, lastName } = req.body;

        // Vérifier l'OTP
        const otp = await OTP.findOne({ phone, code });
        if (!otp) {
            return res.status(400).json({ message: 'Code invalide' });
        }

        if (otp.isExpired()) {
            await OTP.deleteOne({ _id: otp._id });
            return res.status(400).json({ message: 'Code expiré. Demandez-en un nouveau.' });
        }

        if (otp.attempts >= 3) {
            await OTP.deleteOne({ _id: otp._id });
            return res.status(400).json({ message: 'Trop de tentatives. Demandez un nouveau code.' });
        }

        // Chercher ou créer l'utilisateur
        let user = await User.findOne({ phone });

        if (!user) {
            // Nouvel utilisateur - besoin des informations
            if (!firstName || !lastName) {
                return res.status(400).json({
                    message: 'Inscription incomplète',
                    requiresRegistration: true
                });
            }

            user = new User({ firstName, lastName, phone, isVerified: true });
            await user.save();

            // Créer le wallet avec solde initial
            const wallet = new Wallet({ userId: user._id, balance: 500000 });
            await wallet.save();

            console.log(`✅ Nouvel utilisateur créé: ${firstName} ${lastName} (${phone})`);
        }

        // Mettre à jour dernière connexion
        user.lastLogin = new Date();
        await user.save();

        // Supprimer l'OTP utilisé
        await OTP.deleteOne({ _id: otp._id });

        // Générer le token JWT
        const token = jwt.sign(
            { userId: user._id, phone: user.phone },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        // Récupérer le wallet
        const wallet = await Wallet.findOne({ userId: user._id });

        res.json({
            message: 'Connexion réussie',
            token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                phone: user.phone,
                fullName: user.fullName,
                email: user.email,
                avatar: user.avatar
            },
            wallet: {
                balance: wallet.balance,
                currency: wallet.currency
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de la vérification' });
    }
};

// 3. Déconnexion
exports.logout = async (req, res) => {
    try {
        // Ici on pourrait blacklister le token
        res.json({ message: 'Déconnecté avec succès' });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la déconnexion' });
    }
};
