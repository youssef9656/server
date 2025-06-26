const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const { createUser, findUserByEmail } = require("../models/userModel")
const { connectToDatabase } = require("../db")  // ✅ Ajout de cette ligne

const JWT_SECRET = process.env.JWT_SECRET || "supersecret"

exports.register = async (req, res) => {
  const { email, password } = req.body
  const existing = await findUserByEmail(email)
  if (existing) return res.status(400).json({ error: "Email déjà utilisé" })

  const user = await createUser({ email, password })
  res.status(201).json({ success: true, user: { email: user.email } })
}

exports.login = async (req, res) => {
  const { email, password } = req.body;

  const user = await findUserByEmail(email);
  if (!user) return res.status(400).json({ error: "Email ou mot de passe invalide" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ error: "Email ou mot de passe invalide" });

  // ✅ Token court terme pour le frontend
  const token = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: "1h" });

  // ✅ Nouveau sessionToken (ex: long terme, stocké en base)
  const sessionToken = jwt.sign({ email: user.email, time: Date.now() }, JWT_SECRET, { expiresIn: "7d" });

  // ✅ Mise à jour du sessionToken dans la base de données
  const { db } = await connectToDatabase();
  const usersCollection = db.collection("users");

  await usersCollection.updateOne(
    { email },
    {
      $set: {
        sessionToken,
        sessionCreatedAt: new Date()
      }
    }
  );

  // ✅ Réponse au client
  res.json({
    success: true,
    token,           // Token court terme
    sessionToken,    // Token long terme mis à jour
    email: user.email
  });
};

exports.logout = async (req, res) => {
  const email = req.user?.email; // Nécessite authenticateToken middleware

  if (!email) {
    return res.status(401).json({ error: "Non autorisé" });
  }

  try {
    const { db } = await connectToDatabase();
    const usersCollection = db.collection("users");

    await usersCollection.updateOne(
      { email },
      {
        $unset: { sessionToken: "", sessionCreatedAt: "" } // supprime les champs
      }
    );

    res.json({ success: true, message: "Déconnexion réussie" });
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur lors de la déconnexion" });
  }
};



// controllers/authController.js
exports.verify = (req, res) => {
  // Ici req.user est déjà rempli par authenticateToken
  res.json({
    success: true,
    message: "Token valide",
    user: req.user
  })
}


