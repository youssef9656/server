const bcrypt = require("bcryptjs")
const { connectToDatabase } = require("../db")

async function createUser({ email, password }) {
  const { db } = await connectToDatabase()
  const hashedPassword = await bcrypt.hash(password, 10)
  const user = { email, password: hashedPassword }
  await db.collection("users").insertOne(user)
  return user
}

async function findUserByEmail(email) {
  const { db } = await connectToDatabase()
  return db.collection("users").findOne({ email })
}


module.exports = { createUser, findUserByEmail }
