const express = require("express")
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const cors = require("cors")
const { connectToDatabase } = require("../db") // Utiliser votre fichier db.js

const router = express.Router()

// Configuration CORS plus permissive pour le développement
router.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:5173", "http://localhost:3001", "http://127.0.0.1:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
)

// Configuration Multer pour l'upload de fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/cv")

    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
      console.log("📁 Dossier créé:", uploadDir)
    }

    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    // Générer un nom unique pour le fichier
    const uniqueName = `cv_${Date.now()}_${file.originalname}`
    console.log("📝 Nom de fichier généré:", uniqueName)
    cb(null, uniqueName)
  },
})

const fileFilter = (req, file, cb) => {
  console.log("🔍 Vérification du fichier:", file.originalname, file.mimetype)

  // Vérifier le type de fichier
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]

  if (allowedTypes.includes(file.mimetype)) {
    console.log("✅ Type de fichier accepté")
    cb(null, true)
  } else {
    console.log("❌ Type de fichier rejeté:", file.mimetype)
    cb(new Error("Type de fichier non autorisé. Seuls PDF, DOC et DOCX sont acceptés."), false)
  }
}

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
})

// Route POST pour créer une candidature
router.post("/candidature", (req, res) => {
  console.log("📨 Nouvelle requête de candidature reçue")
  console.log("🔍 Headers:", req.headers)

  upload.single("cv")(req, res, async (err) => {
    if (err) {
      console.error("💥 Erreur Multer:", err.message)

      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            error: "Le fichier est trop volumineux (max 5MB)",
            code: "FILE_TOO_LARGE",
          })
        }
      }

      return res.status(400).json({
        error: err.message,
        code: "UPLOAD_ERROR",
      })
    }

    try {
      console.log("📋 Données reçues:", req.body)
      console.log("📁 Fichier reçu:", req.file)

      // Vérifier que le CV est présent
      if (!req.file) {
        console.log("❌ Aucun fichier CV reçu")
        return res.status(400).json({
          error: "Le CV est obligatoire",
          code: "MISSING_CV",
        })
      }

      // Préparer les données de la candidature
      const candidatureData = {
        nom: req.body.nom,
        prenom: req.body.prenom,
        email: req.body.email,
        telephone: req.body.telephone,
        dateNaissance: req.body.dateNaissance,
        nationalite: req.body.nationalite,
        diplomes: req.body.diplomes,
        emploiActuel: req.body.emploiActuel || null,
        domainesIntervention: (() => {
          try {
            return JSON.parse(req.body.domainesIntervention || "[]")
          } catch {
            return req.body.domainesIntervention || []
          }
        })(),
        experiencesProfessionnelles: req.body.experiencesProfessionnelles,
        cvFileName: req.file.filename,
        cvPath: `/uploads/cv/${req.file.filename}`,
        cvOriginalName: req.file.originalname,
        cvSize: req.file.size,
        cvMimeType: req.file.mimetype,
        dateCreation: new Date(),
        statut: "En attente",
      }

      console.log("📦 Données préparées:", candidatureData)

      // Validation des champs obligatoires
      const requiredFields = [
        "nom",
        "prenom",
        "email",
        "telephone",
        "dateNaissance",
        "nationalite",
        "diplomes",
        "experiencesProfessionnelles",
      ]

      for (const field of requiredFields) {
        if (!candidatureData[field]) {
          console.log(`❌ Champ manquant: ${field}`)

          // Supprimer le fichier uploadé en cas d'erreur de validation
          if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path)
            console.log("🗑️ Fichier supprimé suite à l'erreur de validation")
          }

          return res.status(400).json({
            error: `Le champ ${field} est obligatoire`,
            code: "MISSING_FIELD",
            field: field,
          })
        }
      }

      // Validation de l'email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(candidatureData.email)) {
        console.log("❌ Format d'email invalide:", candidatureData.email)

        // Supprimer le fichier uploadé
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path)
        }

        return res.status(400).json({
          error: "Format d'email invalide",
          code: "INVALID_EMAIL",
        })
      }

      // Connexion à MongoDB en utilisant votre db.js
      console.log("🔌 Connexion à MongoDB...")
      const { db } = await connectToDatabase()
      const collection = db.collection("candidatures")

      // Vérifier si l'email existe déjà
      const existingCandidate = await collection.findOne({ email: candidatureData.email })
      if (existingCandidate) {
        console.log("❌ Email déjà existant:", candidatureData.email)

        // Supprimer le fichier uploadé si l'email existe déjà
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path)
        }

        return res.status(400).json({
          error: "Une candidature avec cet email existe déjà",
          code: "EMAIL_EXISTS",
        })
      }

      // Insérer la candidature
      console.log("💾 Insertion en base de données...")
      const result = await collection.insertOne(candidatureData)

      console.log("✅ Candidature enregistrée avec l'ID:", result.insertedId)

      res.status(201).json({
        success: true,
        message: "Candidature enregistrée avec succès",
        id: result.insertedId,
        data: {
          nom: candidatureData.nom,
          prenom: candidatureData.prenom,
          email: candidatureData.email,
          dateCreation: candidatureData.dateCreation,
          cvFileName: candidatureData.cvFileName,
        },
      })
    } catch (error) {
      console.error("💥 Erreur lors de l'enregistrement:", error)

      // Supprimer le fichier en cas d'erreur
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path)
        console.log("🗑️ Fichier supprimé suite à l'erreur")
      }

      res.status(500).json({
        error: "Erreur interne du serveur",
        code: "INTERNAL_ERROR",
        details: process.env.NODE_ENV === "development" ? error.message : "Une erreur est survenue",
      })
    }
  })
})

// Route GET pour récupérer toutes les candidatures (optionnel - pour admin)
router.get("/candidatures", async (req, res) => {
  try {
    console.log("📋 Récupération des candidatures")
    const { db } = await connectToDatabase()
    const collection = db.collection("candidatures")

    // Pagination
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit

    // Filtres
    const filter = {}
    if (req.query.statut) {
      filter.statut = req.query.statut
    }
    if (req.query.nationalite) {
      filter.nationalite = req.query.nationalite
    }

    const candidatures = await collection.find(filter).sort({ dateCreation: -1 }).skip(skip).limit(limit).toArray()

    const total = await collection.countDocuments(filter)

    console.log(`✅ ${candidatures.length} candidatures récupérées`)

    res.json({
      success: true,
      data: candidatures,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("💥 Erreur lors de la récupération:", error)
    res.status(500).json({
      error: "Erreur interne du serveur",
      details: process.env.NODE_ENV === "development" ? error.message : "Une erreur est survenue",
    })
  }
})

// Route GET pour récupérer une candidature par ID
router.get("/candidature/:id", async (req, res) => {
  try {
    const { ObjectId } = require("mongodb")
    const { db } = await connectToDatabase()
    const collection = db.collection("candidatures")

    // Vérifier que l'ID est valide
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        error: "ID invalide",
      })
    }

    const candidature = await collection.findOne({ _id: new ObjectId(req.params.id) })

    if (!candidature) {
      return res.status(404).json({
        error: "Candidature non trouvée",
      })
    }

    res.json({
      success: true,
      data: candidature,
    })
  } catch (error) {
    console.error("💥 Erreur lors de la récupération:", error)
    res.status(500).json({
      error: "Erreur interne du serveur",
      details: process.env.NODE_ENV === "development" ? error.message : "Une erreur est survenue",
    })
  }
})

// Route PUT pour mettre à jour le statut d'une candidature
router.put("/candidature/:id/statut", async (req, res) => {
  try {
    const { ObjectId } = require("mongodb")
    const { db } = await connectToDatabase()
    const collection = db.collection("candidatures")

    // Vérifier que l'ID est valide
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        error: "ID invalide",
      })
    }

    const { statut } = req.body
    const statutsValides = ["En attente", "Accepté", "Refusé", "En cours d'évaluation"]

    if (!statut || !statutsValides.includes(statut)) {
      return res.status(400).json({
        error: "Statut invalide. Valeurs acceptées: " + statutsValides.join(", "),
      })
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(req.params.id) },
      {
        $set: {
          statut: statut,
          dateModification: new Date(),
        },
      },
    )

    if (result.matchedCount === 0) {
      return res.status(404).json({
        error: "Candidature non trouvée",
      })
    }

    res.json({
      success: true,
      message: "Statut mis à jour avec succès",
    })
  } catch (error) {
    console.error("💥 Erreur lors de la mise à jour:", error)
    res.status(500).json({
      error: "Erreur interne du serveur",
      details: process.env.NODE_ENV === "development" ? error.message : "Une erreur est survenue",
    })
  }
})

// Route DELETE pour supprimer une candidature
router.delete("/candidature/:id", async (req, res) => {
  try {
    const { ObjectId } = require("mongodb")
    const { db } = await connectToDatabase()
    const collection = db.collection("candidatures")

    // Vérifier que l'ID est valide
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        error: "ID invalide",
      })
    }

    // Récupérer la candidature pour supprimer le fichier CV
    const candidature = await collection.findOne({ _id: new ObjectId(req.params.id) })

    if (!candidature) {
      return res.status(404).json({
        error: "Candidature non trouvée",
      })
    }

    // Supprimer le fichier CV s'il existe
    if (candidature.cvFileName) {
      const filePath = path.join(__dirname, "../uploads/cv", candidature.cvFileName)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        console.log("🗑️ Fichier CV supprimé:", candidature.cvFileName)
      }
    }

    // Supprimer la candidature de la base de données
    await collection.deleteOne({ _id: new ObjectId(req.params.id) })

    console.log("✅ Candidature supprimée:", req.params.id)

    res.json({
      success: true,
      message: "Candidature supprimée avec succès",
    })
  } catch (error) {
    console.error("💥 Erreur lors de la suppression:", error)
    res.status(500).json({
      error: "Erreur interne du serveur",
      details: process.env.NODE_ENV === "development" ? error.message : "Une erreur est survenue",
    })
  }
})

module.exports = router
