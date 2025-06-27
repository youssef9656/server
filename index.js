const express = require("express")
const cors = require("cors")
require("dotenv").config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())
app.use("/uploads", express.static("uploads"))


// Route healthcheck obligatoire pour Railway
app.get('/', (req, res) => {
  res.status(200).send('Server is running');
});

// Route centralisée
const appRoutes = require("./routes/appRoute")
app.use("/api", appRoutes)

app.listen(PORT, () => {
  console.log(`✅ Serveur lancé sur http://localhost:${PORT}`)
})

const { createAdminUser } = require("./utils/initAdmin")
createAdminUser()


