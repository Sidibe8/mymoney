// src/app.js - Version modifiée pour Vercel
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const dotenv = require("dotenv");

dotenv.config();

const connectDB = require("./config/database");
const authRoutes = require("./routes/authRoutes");
const walletRoutes = require("./routes/walletRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();

// Connexion à MongoDB (sera établie à chaque requête en serverless)
// On utilise un cache pour éviter de reconnecter à chaque fois
let isConnected = false;

const connectToDatabase = async () => {
  if (!isConnected) {
    await connectDB();
    isConnected = true;
  }
};

// Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json());

// Middleware pour connecter DB avant chaque requête
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    console.error("Database connection error:", error);
    res
      .status(500)
      .json({ message: "Erreur de connexion à la base de données" });
  }
});

// Routes API
app.use("/api/auth", authRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/user", userRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date(),
    uptime: process.uptime(),
  });
});

// Route racine
app.get("/", (req, res) => {
  res.json({
    message: "API MyMoney - Mobile Money Application",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      wallet: "/api/wallet",
      transactions: "/api/transactions",
      user: "/api/user",
    },
  });
});

// Route 404
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route non trouvée" });
});

// Gestionnaire d'erreurs
app.use((err, req, res, next) => {
  console.error("❌ Erreur:", err.stack);
  res.status(500).json({
    message: "Une erreur interne est survenue",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Pour Vercel serverless
module.exports = app;

// Pour le développement local
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
  });
}
