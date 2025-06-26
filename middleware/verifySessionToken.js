const jwt = require("jsonwebtoken")
const { connectToDatabase } = require("../db")

const JWT_SECRET = process.env.JWT_SECRET || "supersecret"

exports.verifySessionToken = async (req, res, next) => {
  try {
    // 🔁 Récupérer le token depuis le corps de la requête (body)
    const { token } = req.body

    if (!token) {
      return res.status(401).json({
        error: "Token manquant dans le corps de la requête",
        code: "MISSING_TOKEN_IN_BODY",
      })
    }

    // ✅ Vérifier la validité du token JWT
    const decoded = jwt.verify(token, JWT_SECRET)

    // ✅ Connexion à la base de données
    const { db } = await connectToDatabase()

    // ✅ Rechercher l'utilisateur avec email et token
    const user = await db.collection("users").findOne({
      email: decoded.email,
      sessionToken: token,
    })

    if (!user) {
      return res.status(403).json({
        error: "Token invalide ou session expirée",
        code: "INVALID_OR_EXPIRED_TOKEN",
      })
    }

    // ✅ Ajouter les infos utilisateur à la requête
    req.user = user

    // ✅ Continuer
    next()
  } catch (error) {
    return res.status(403).json({
      error: "Échec de vérification du token",
      code: "INVALID_OR_EXPIRED_TOKEN",
    })
  }
}
