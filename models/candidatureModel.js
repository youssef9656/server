const { connectToDatabase } = require("../db")

const getCandidatureCollection = async () => {
  const { db } = await connectToDatabase()
  return db.collection("candidatures")
}

module.exports = {
  getCandidatureCollection,
}
