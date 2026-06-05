const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const dotenv = require("dotenv");

dotenv.config();

const connectDB = require("./config/database");
const authRoutes = require("./routes/authRoutes");
const walletRoutes = require("./routes/walletRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();

// Connexion à MongoDB
connectDB();

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
app.use(morgan("dev"));

// Routes API
app.use("/api/auth", authRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/user", userRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date(),
    uptime: process.uptime(),
  });
});

// Route 404
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route non trouvée" });
});

// Gestionnaire d'erreurs global
app.use((err, req, res, next) => {
  console.error("❌ Erreur:", err.stack);
  res.status(500).json({
    message: "Une erreur interne est survenue",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});
app.use((req, res, next) => {
  console.log("======================================");
  console.log(`📥 REQUEST: ${req.method} ${req.originalUrl}`);
  console.log("📌 Headers:", req.headers);
  console.log("📦 Body:", req.body);
  console.log("🌐 IP:", req.ip);
  console.log("======================================");
  next();
});

const PORT = process.env.PORT || 3000;
const http = require("http");
const server = http.createServer(app);

// Socket.IO
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Expose io via app so controllers can access it
app.set("io", io);

io.on("connection", (socket) => {
  console.log("📡 Client connecté", socket.id);

  socket.on("join", ({ userId }) => {
    if (userId) {
      const room = `user:${userId}`;
      socket.join(room);
      console.log(`Socket ${socket.id} rejoint ${room}`);
    }
  });

  socket.on("disconnect", () => {
    console.log("📴 Client déconnecté", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(
    `\n  🚀 Serveur MyMoney démarré !\n  📡 Port: ${PORT}\n  🔗 http://localhost:${PORT}\n  ❤️  Health: http://localhost:${PORT}/health\n  `,
  );
});

module.exports = { app, io, server };
