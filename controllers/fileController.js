const path = require("path")
const fs = require("fs")

exports.getCvFile = (req, res) => {
  const filename = req.params.filename

  // On sécurise le nom de fichier pour éviter les chemins relatifs
  const safeFilename = path.basename(filename)

  const filePath = path.join(__dirname, "../uploads/cv", safeFilename)

  // Vérifier l'existence du fichier
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: "Fichier non trouvé." })
  }

  // Télécharger le fichier
  res.download(filePath, safeFilename, (err) => {
    if (err) {
      console.error("Erreur lors du téléchargement :", err)
      res.status(500).json({ success: false, error: "Erreur de téléchargement." })
    }
  })
}
