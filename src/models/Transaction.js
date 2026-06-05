const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    type: {
        type: String,
        enum: ['transfer', 'payment', 'deposit', 'withdraw'],
        required: true
    },
    service: {
        type: String,
        enum: ['ISAGO', 'CANAL+', 'EDM', 'EAU', 'INTERNET', 'PHARMACY', null],
        default: null
    },
    serviceReference: {
        type: String,
        default: null
    },
    status: {
        type: String,
        enum: ['completed', 'pending', 'failed'],
        default: 'completed'
    },
    reference: {
        type: String,
        unique: true
    },
    description: {
        type: String,
        trim: true
    },
    fees: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Générer une référence unique avant sauvegarde
transactionSchema.pre('save', async function (next) {
    if (!this.reference) {
        const date = new Date();
        const timestamp = date.getTime().toString().slice(-8);
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        this.reference = `TX${timestamp}${random}`;
    }
    next();
});

// Index pour les recherches rapides
transactionSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
