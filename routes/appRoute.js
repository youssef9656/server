const express = require("express");
const router = express.Router();

// Contrôleurs
const authController = require("../controllers/authController");
const candidatureController = require("../controllers/candidatureController");
const contactController = require("../controllers/contactController");
const { sendContactEmail } = require("../controllers/emailController");
const { sendCandidatureEmail } = require("../controllers/candidatureEmailController");
const { getCvFile } = require("../controllers/fileController");

// Middleware d'authentification
const { authenticateToken } = require("../middleware/authenticateToken");
const { verifySessionToken } = require("../middleware/verifySessionToken");

// =======================
// Routes d'authentification
// =======================

// Enregistrement d'un nouvel utilisateur
router.post("/auth/register", authController.register);

// Connexion d'un utilisateur
router.post("/auth/login", authController.login);

// Vérification de session (JWT + session token)
router.post("/auth/verify", authenticateToken, verifySessionToken, authController.verify);

// Déconnexion d'un utilisateur
router.post("/auth/logout", authenticateToken, authController.logout);

// =======================
// Routes des candidatures
// =======================

// Créer une nouvelle candidature
router.post("/candidature", candidatureController.createCandidature);

// Récupérer toutes les candidatures (authentification requise)
router.get("/candidatures", authenticateToken, candidatureController.getCandidatures);

// Récupérer une candidature spécifique par ID
router.get("/candidature/:id", authenticateToken, candidatureController.getCandidatureById);

// Mettre à jour le statut d'une candidature
router.put("/candidature/:id/statut", authenticateToken, candidatureController.updateCandidatureStatut);

// Supprimer une candidature
router.delete("/candidature/:id", authenticateToken, candidatureController.deleteCandidature);

// =======================
// Routes de contact
// =======================

// Soumettre un message via le formulaire de contact
router.post("/contact", contactController.handleContactForm);

// Récupérer tous les messages de contact (authentification requise)
router.get("/contacts", authenticateToken, contactController.getAllContacts);

// =======================
// Routes pour les emails
// =======================

// Envoyer un email depuis le formulaire de contact
router.post("/send-email", sendContactEmail);
const { replyToContactMessage } = require("../controllers/contactController");

router.post("/reply", replyToContactMessage);

const { updateContact} = require("../controllers/contactController")

router.put("/contact/:id", updateContact) // 🛠 Route pour modifier un contact





// Envoyer un message lié à une candidature
router.post("/candidature/envoyer-message", sendCandidatureEmail);




// =======================
// Téléchargement de fichiers (CV)
// =======================

// Télécharger un fichier CV à partir du nom de fichier
router.get("/cv/:filename", getCvFile);

// =======================
// Tableau de bord utilisateur
// =======================

// Route protégée avec vérification de session
router.get("/dashboard", verifySessionToken, (req, res) => {
  res.json({
    success: true,
    message: `Bienvenue ${req.user.email}, vous êtes authentifié.`,
  });
});

module.exports = router;
