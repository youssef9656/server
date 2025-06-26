const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// 🔗 Connexion à MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ Connecté à MongoDB Atlas"))
.catch((err) => console.error("❌ Erreur de connexion MongoDB :", err));

// Route healthcheck obligatoire pour Railway
app.get('/', (req, res) => {
  res.status(200).send('Server is running');
});

// Routes API
const appRoutes = require("./routes/appRoute");
app.use("/api", appRoutes);

// Lancer serveur
app.listen(PORT, () => {
  console.log(`✅ Serveur lancé sur le port ${PORT}`);
});

// Initialiser l'admin
const { createAdminUser } = require("./utils/initAdmin");
createAdminUser();
