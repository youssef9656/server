const sendEmail = require("../utils/sendEmail")

exports.sendContactEmail = async (req, res) => {
  const { email, message } = req.body

  const htmlContent = `
    <h3>Nouveau message depuis le formulaire de contact</h3>
    <p><strong>Expéditeur :</strong> ${email}</p>
    <p><strong>Message :</strong></p>
    <p>${message}</p>
  `

  try {
    // Email envoyé toujours à toi-même :
    await sendEmail("youssefhamraoui60@gmail.com", "Nouveau message du site", htmlContent)

    res.status(200).json({ success: true, message: "Message envoyé avec succès." })
  } catch (error) {
    res.status(500).json({ success: false, error: "Erreur lors de l'envoi de l'email." })
  }
}
