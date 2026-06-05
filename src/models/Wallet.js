const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    balance: {
        type: Number,
        default: 500000, // 500k FCFA pour la démo
        min: 0
    },
    currency: {
        type: String,
        default: 'XOF'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    dailyLimit: {
        type: Number,
        default: 500000
    },
    dailySpent: {
        type: Number,
        default: 0
    },
    lastResetDate: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Réinitialiser la limite quotidienne
walletSchema.methods.resetDailyLimit = async function () {
    const today = new Date().setHours(0, 0, 0, 0);
    const lastReset = new Date(this.lastResetDate).setHours(0, 0, 0, 0);

    if (today > lastReset) {
        this.dailySpent = 0;
        this.lastResetDate = new Date();
        await this.save();
    }
    return this.dailySpent;
};

// Vérifier la limite quotidienne
walletSchema.methods.checkDailyLimit = async function (amount) {
    await this.resetDailyLimit();
    if (this.dailySpent + amount > this.dailyLimit) {
        throw new Error('Limite quotidienne dépassée');
    }
    return true;
};

// Débiter le wallet
walletSchema.methods.debit = async function (amount) {
    if (this.balance < amount) {
        throw new Error('Solde insuffisant');
    }
    await this.checkDailyLimit(amount);

    this.balance -= amount;
    this.dailySpent += amount;
    this.updatedAt = Date.now();
    await this.save();
    return this.balance;
};

// Créditer le wallet
walletSchema.methods.credit = async function (amount) {
    this.balance += amount;
    this.updatedAt = Date.now();
    await this.save();
    return this.balance;
};

module.exports = mongoose.model('Wallet', walletSchema);
