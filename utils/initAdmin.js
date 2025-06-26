const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const { connectToDatabase } = require("../db")

// Utilise un secret depuis .env ou une valeur par défaut
const JWT_SECRET = process.env.JWT_SECRET || "supersecret"

async function createAdminUser() {
  const { db } = await connectToDatabase()
  const usersCollection = db.collection("users")

  const email = "admin@ifpe.com"
  const existing = await usersCollection.findOne({ email })

  if (existing) {
    console.log("🔁 Admin déjà existant.")
    return
  }

  const hashedPassword = await bcrypt.hash("admin123", 10)

  // Générer un token de session
  const token = jwt.sign(
    { email, role: "admin" },
    JWT_SECRET,
    { expiresIn: "7d" } // token valide 7 jours
  )

  // Insérer l'utilisateur admin avec le token
  await usersCollection.insertOne({
    email,
    password: hashedPassword,
    role: "admin",
    sessionToken: token,        // 🟢 ajouté ici
    createdAt: new Date(),
  })

  console.log("✅ Utilisateur admin créé avec succès avec token.")
}

module.exports = { createAdminUser }
