// API Backend mise à jour pour traiter les données complètes

const { getCandidatureCollection } = require("../models/candidatureModel")
const { ObjectId } = require("mongodb")
const sendEmail = require("../utils/sendEmail")

// Fonction pour formater le message avec les données du candidat
function formatEmailMessage(template, candidatureData) {
  let formattedMessage = template

  // Remplacer toutes les variables disponibles
  const replacements = {
    "{{nom}}": candidatureData.nom || "",
    "{{prenom}}": candidatureData.prenom || "",
    "{{email}}": candidatureData.email || "",
    "{{telephone}}": candidatureData.telephone || "",
    "{{dateNaissance}}": candidatureData.dateNaissance
      ? new Date(candidatureData.dateNaissance).toLocaleDateString("fr-FR")
      : "",
    "{{nationalite}}": candidatureData.nationalite || "",
    "{{diplomes}}": candidatureData.diplomes || "",
    "{{emploiActuel}}": candidatureData.emploiActuel || "Non spécifié",
    "{{domainesIntervention}}": Array.isArray(candidatureData.domainesIntervention)
      ? candidatureData.domainesIntervention.join(", ")
      : "",
    "{{experiencesProfessionnelles}}": candidatureData.experiencesProfessionnelles || "",
    "{{statut}}": candidatureData.statut || "",
    "{{dateCreation}}": candidatureData.dateCreation
      ? new Date(candidatureData.dateCreation).toLocaleDateString("fr-FR")
      : "",
    "{{emailsEnvoyes}}": candidatureData.emailsEnvoyes || 0,
    "{{dernierEmailEnvoye}}": candidatureData.dernierEmailEnvoye
      ? new Date(candidatureData.dernierEmailEnvoye).toLocaleDateString("fr-FR")
      : "Jamais",
  }

  // Remplacer toutes les variables dans le template
  Object.keys(replacements).forEach((variable) => {
    const regex = new RegExp(variable.replace(/[{}]/g, "\\$&"), "g")
    formattedMessage = formattedMessage.replace(regex, replacements[variable])
  })

  return formattedMessage
}

// Fonction pour créer le contenu HTML de l'email
function createEmailHTML(message, candidatureData) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1890ff; border-bottom: 2px solid #1890ff; padding-bottom: 10px;">
        Message de la plateforme
      </h2>
      
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #333;">Bonjour ${candidatureData.prenom} ${candidatureData.nom},</h3>
        <div style="line-height: 1.6; color: #555;">
          ${message.replace(/\n/g, "<br>")}
        </div>
      </div>

      <div style="background-color: #e6f7ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h4 style="margin-top: 0; color: #1890ff;">Informations de votre candidature :</h4>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 5px; font-weight: bold; color: #333;">Statut actuel :</td>
            <td style="padding: 5px; color: #555;">${candidatureData.statut}</td>
          </tr>
          <tr>
            <td style="padding: 5px; font-weight: bold; color: #333;">Email :</td>
            <td style="padding: 5px; color: #555;">${candidatureData.email}</td>
          </tr>
          <tr>
            <td style="padding: 5px; font-weight: bold; color: #333;">Téléphone :</td>
            <td style="padding: 5px; color: #555;">${candidatureData.telephone}</td>
          </tr>
          <tr>
            <td style="padding: 5px; font-weight: bold; color: #333;">Nationalité :</td>
            <td style="padding: 5px; color: #555;">${candidatureData.nationalite}</td>
          </tr>
          ${
            candidatureData.domainesIntervention && candidatureData.domainesIntervention.length > 0
              ? `
          <tr>
            <td style="padding: 5px; font-weight: bold; color: #333;">Domaines :</td>
            <td style="padding: 5px; color: #555;">${candidatureData.domainesIntervention.join(", ")}</td>
          </tr>
          `
              : ""
          }
        </table>
      </div>

      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
        <p style="color: #888; font-size: 12px;">
          Cet email a été envoyé automatiquement depuis notre plateforme de gestion des candidatures.
        </p>
      </div>
    </div>
  `
}

exports.sendCandidatureEmail = async (req, res) => {
  const { message, candidatureData } = req.body

  const fromEmail = "fsdfeef25@gmail.com"

  if (!message || !candidatureData || !candidatureData.email) {
    return res.status(400).json({
      success: false,
      error: "Message et données complètes du candidat requis.",
    })
  }

  try {
    console.log("Données reçues:", {
      message: message.substring(0, 100) + "...",
      candidat: `${candidatureData.prenom} ${candidatureData.nom}`,
      email: candidatureData.email,
      statut: candidatureData.statut,
    })

    // Formater le message avec les données du candidat
    const formattedMessage = formatEmailMessage(message, candidatureData)

    // Créer le contenu HTML de l'email
    const htmlContent = createEmailHTML(formattedMessage, candidatureData)

    // Envoyer l'email
    await sendEmail(candidatureData.email, "Message de la plateforme", htmlContent)

    // Incrémenter le compteur d'emails envoyés
    const collection = await getCandidatureCollection()
    await collection.updateOne(
      { email: candidatureData.email },
      {
        $inc: { emailsEnvoyes: 1 },
        $set: {
          dernierEmailEnvoye: new Date(),
          dernierMessageEnvoye: formattedMessage, // Sauvegarder le message formaté
        },
      },
    )

    res.status(200).json({
      success: true,
      message: "Message envoyé au candidat avec succès.",
      candidatEmail: candidatureData.email,
      candidatNom: `${candidatureData.prenom} ${candidatureData.nom}`,
      messageFormate: formattedMessage,
    })
  } catch (error) {
    console.error("Erreur email :", error)
    res.status(500).json({
      success: false,
      error: "Erreur lors de l'envoi du message.",
      details: error.message,
    })
  }
}

// Nouvelle route pour obtenir les templates de messages
exports.getMessageTemplates = async (req, res) => {
  const templates = {
    acceptation: {
      nom: "Message d'acceptation",
      contenu: `Félicitations {{prenom}} {{nom}} !

Nous avons le plaisir de vous informer que votre candidature a été acceptée.

Votre profil correspond parfaitement à nos attentes :
- Diplômes : {{diplomes}}
- Domaines d'intervention : {{domainesIntervention}}
- Statut actuel : {{statut}}

Nous vous contacterons prochainement pour la suite du processus.

Cordialement,
L'équipe de recrutement`,
    },
    refus: {
      nom: "Message de refus",
      contenu: `Bonjour {{prenom}} {{nom}},

Nous vous remercions pour l'intérêt que vous portez à notre organisation.

Après étude attentive de votre candidature, nous regrettons de vous informer que nous ne pouvons pas donner suite à votre demande pour le moment.

Votre profil :
- Diplômes : {{diplomes}}
- Nationalité : {{nationalite}}
- Statut : {{statut}}

Nous conservons votre candidature dans notre base de données pour de futures opportunités.

Cordialement,
L'équipe de recrutement`,
    },
    relance: {
      nom: "Message de relance",
      contenu: `Bonjour {{prenom}} {{nom}},

Nous revenons vers vous concernant votre candidature déposée le {{dateCreation}}.

Statut actuel : {{statut}}
Nombre d'emails reçus : {{emailsEnvoyes}}

Nous souhaitons avoir des informations complémentaires sur votre profil.

Pourriez-vous nous confirmer votre disponibilité ?

Cordialement,
L'équipe de recrutement`,
    },
  }

  res.json({ success: true, templates })
}
