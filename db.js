require("dotenv").config()
const { MongoClient } = require("mongodb")

const uri = process.env.MONGODB_URI
const dbName = process.env.DB_NAME

let cachedClient = null
let cachedDb = null

async function connectToDatabase() {
  if (cachedClient && cachedDb) return { client: cachedClient, db: cachedDb }

  const client = new MongoClient(uri)
  await client.connect()

  const db = client.db(dbName)
  cachedClient = client
  cachedDb = db

  return { client, db }
}

module.exports = { connectToDatabase }
