const { insertContactMessage, getAllContactMessages } = require("../models/contactModel")
const sendEmail = require("../utils/sendEmail")
const { updateContactStatut } = require("../models/contactModel");

exports.handleContactForm = async (req, res) => {
  const { fullName, email, phone, subject, message } = req.body

  try {
    await insertContactMessage({
      fullName,
      email,
      phone,
      subject,
      message,
      createdAt: new Date(),
    })

    const htmlContent = `
      <h3>Nouveau message de contact</h3>
      <p><strong>Nom :</strong> ${fullName}</p>
      <p><strong>Email :</strong> ${email}</p>
      ${phone ? `<p><strong>Téléphone :</strong> ${phone}</p>` : ""}
      <p><strong>Sujet :</strong> ${subject}</p>
      <p><strong>Message :</strong></p>
      <p>${message}</p>
    `

    await sendEmail("youssefhamraoui60@gmail.com", `Contact : ${subject}`, htmlContent)

    res.status(201).json({ success: true, message: "Message enregistré et envoyé." })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: "Erreur lors de l'enregistrement ou de l'envoi." })
  }
}

exports.getAllContacts = async (req, res) => {
  try {
    const contacts = await getAllContactMessages()
    res.status(200).json({ success: true, data: contacts })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: "Erreur lors de la récupération des messages." })
  }
}


exports.replyToContactMessage = async (req, res) => {
  const { email, subject, replyMessage,contactId } = req.body

  if (!email || !replyMessage) {
    return res.status(400).json({ success: false, error: "Email et message de réponse sont requis." })
  }

  try {
    const htmlReply = `
      <p>Bonjour,</p>
      <p>${replyMessage}</p>
      <p>Cordialement,<br>L'équipe</p>
    `

    await sendEmail(email, `Réponse à votre message : ${subject || "sans sujet"}`, htmlReply)

    // ✅ Mise à jour du statut
    await updateContactStatut(contactId, "Répondu")

    res.status(200).json({ success: true, message: "Réponse envoyée et statut mis à jour." })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: "Erreur lors de l'envoi de la réponse." })
  }
}


exports.updateContact = async (req, res) => {
  const { id } = req.params
  const { fullName, email, phone, subject, message } = req.body

  try {
    const success = await updateContactMessage(id, {
      fullName,
      email,
      phone,
      subject,
      message,
      updatedAt: new Date()
    })

    if (!success) {
      return res.status(404).json({ success: false, message: "Contact non trouvé." })
    }

    res.status(200).json({ success: true, message: "Contact modifié avec succès." })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, error: "Erreur lors de la modification du contact." })
  }
}
