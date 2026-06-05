const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    index: true,
  },
  code: {
    type: String,
    required: true,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: "0s" }, // Correction: '0s' pour supprimer à expiration
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Vérifier si l'OTP est expiré
otpSchema.methods.isExpired = function () {
  return Date.now() > this.expiresAt;
};

// Incrémenter les tentatives
otpSchema.methods.incrementAttempts = async function () {
  this.attempts += 1;
  await this.save();
  return this.attempts;
};

module.exports = mongoose.model("OTP", otpSchema);
