const multer = require("multer")
const fs = require("fs")
const path = require("path")
const { ObjectId } = require("mongodb")
const { getCandidatureCollection } = require("../models/candidatureModel")
const sendEmail = require("../utils/sendEmail")

// ========== Config upload (comme avant) ========== //
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/cv")
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueName = `cv_${Date.now()}_${file.originalname}`
    cb(null, uniqueName)
  },
})

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]
  if (allowedTypes.includes(file.mimetype)) cb(null, true)
  else cb(new Error("Type de fichier non autorisé."), false)
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single("cv")

// ========== Contrôleurs ========== //
exports.createCandidature = (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message })

    try {
      const {
        nom, prenom, email, telephone, dateNaissance,
        nationalite, diplomes, emploiActuel, domainesIntervention,
        experiencesProfessionnelles
      } = req.body

      const requiredFields = [nom, prenom, email, telephone, dateNaissance, nationalite, diplomes, experiencesProfessionnelles]
      if (requiredFields.some(f => !f)) {
        if (req.file?.path) fs.unlinkSync(req.file.path)
        return res.status(400).json({ error: "Un champ requis est manquant." })
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        if (req.file?.path) fs.unlinkSync(req.file.path)
        return res.status(400).json({ error: "Email invalide" })
      }

      const collection = await getCandidatureCollection()
      const exists = await collection.findOne({ email })
      if (exists) {
        if (req.file?.path) fs.unlinkSync(req.file.path)
        return res.status(400).json({ error: "Candidature déjà existante" })
      }

      const candidature = {
        nom, prenom, email, telephone, dateNaissance, nationalite, diplomes,
        emploiActuel: emploiActuel || null,
        domainesIntervention: (() => {
          try { return JSON.parse(domainesIntervention || "[]") } catch { return [] }
        })(),
        experiencesProfessionnelles,
        cvFileName: req.file.filename,
        cvPath: `/uploads/cv/${req.file.filename}`,
        cvOriginalName: req.file.originalname,
        cvSize: req.file.size,
        cvMimeType: req.file.mimetype,
        dateCreation: new Date(),
        statut: "En attente",
      }

      const result = await collection.insertOne(candidature)

      // Préparer le contenu de l'email
const subject = "Nouvelle candidature reçue"
const htmlContent = `
  <h2>Nouvelle candidature soumise</h2>
  <p><strong>Nom :</strong> ${nom}</p>
  <p><strong>Prénom :</strong> ${prenom}</p>
  <p><strong>Email :</strong> ${email}</p>
  <p><strong>Téléphone :</strong> ${telephone}</p>
  <p><strong>Date de naissance :</strong> ${dateNaissance}</p>
  <p><strong>Nationalité :</strong> ${nationalite}</p>
  <p><strong>Diplômes :</strong> ${diplomes}</p>
  <p><strong>Emploi actuel :</strong> ${emploiActuel || "Non renseigné"}</p>
  <p><strong>Domaines d'intervention :</strong> ${(candidature.domainesIntervention || []).join(", ")}</p>
  <p><strong>Expériences :</strong> ${experiencesProfessionnelles}</p>
  <p><strong>CV :</strong> <a href="http://localhost:5000${candidature.cvPath}" target="_blank">Voir le CV</a></p>
`

// Envoyer l'email (à adapter selon l’adresse réelle)
await sendEmail("youssefhamraoui60@gmail.com", `Contact : ${subject}`, htmlContent)
      res.status(201).json({
        success: true,
        message: "Candidature enregistrée",
        id: result.insertedId,
      })
    } catch (error) {
      if (req.file?.path) fs.unlinkSync(req.file.path)
      res.status(500).json({ error: "Erreur serveur", details: error.message })
    }
  })
}

exports.getCandidatures = async (req, res) => {
  try {
    const collection = await getCandidatureCollection()
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit
    const filter = {}

    if (req.query.statut) filter.statut = req.query.statut
    if (req.query.nationalite) filter.nationalite = req.query.nationalite

    const data = await collection.find(filter).sort({ dateCreation: -1 }).skip(skip).limit(limit).toArray()
    const total = await collection.countDocuments(filter)

    res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur", details: error.message })
  }
}

exports.getCandidatureById = async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "ID invalide" })
    const collection = await getCandidatureCollection()
    const data = await collection.findOne({ _id: new ObjectId(req.params.id) })
    if (!data) return res.status(404).json({ error: "Non trouvée" })
    res.json({ success: true, data })
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur", details: error.message })
  }
}

exports.updateCandidatureStatut = async (req, res) => {
  try {
    const { statut } = req.body
    const statuts = ["En attente", "Accepté", "Refusé", "En cours d'évaluation"]
    if (!statut || !statuts.includes(statut)) return res.status(400).json({ error: "Statut invalide" })

    const collection = await getCandidatureCollection()
    const result = await collection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { statut, dateModification: new Date() } }
    )

    if (result.matchedCount === 0) return res.status(404).json({ error: "Candidature non trouvée" })

    res.json({ success: true, message: "Statut mis à jour" })
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur", details: error.message })
  }
}

exports.deleteCandidature = async (req, res) => {
  try {
    const collection = await getCandidatureCollection()
    const id = req.params.id
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "ID invalide" })

    const candidature = await collection.findOne({ _id: new ObjectId(id) })
    if (!candidature) return res.status(404).json({ error: "Non trouvée" })

    if (candidature.cvFileName) {
      const filePath = path.join(__dirname, "../uploads/cv", candidature.cvFileName)
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    }

    await collection.deleteOne({ _id: new ObjectId(id) })
    res.json({ success: true, message: "Candidature supprimée" })
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur", details: error.message })
  }
}
