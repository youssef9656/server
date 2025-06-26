const { ObjectId } = require("mongodb")
const { connectToDatabase } = require("../db")

const getContactCollection = async () => {
  const { db } = await connectToDatabase()
  return db.collection("contacts")
}

const insertContactMessage = async (contactData) => {
  const collection = await getContactCollection()
  const result = await collection.insertOne(contactData)
  return result
}

const getAllContactMessages = async () => {
  const collection = await getContactCollection()
  const contacts = await collection.find().sort({ createdAt: -1 }).toArray()
  return contacts
}

const updateContactMessage = async (id, updatedFields) => {
  const collection = await getContactCollection()
  const result = await collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: updatedFields }
  )
  return result.modifiedCount > 0
}

const updateContactStatut = async (id, newStatus) => {
  if (!ObjectId.isValid(id)) {
    throw new Error("ID invalide pour updateContactStatut");
  }

  const collection = await getContactCollection();
  return collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: newStatus } }
  );
};


module.exports = {
  getContactCollection,
  insertContactMessage,
  getAllContactMessages,
  updateContactMessage, // 👈 N'oublie pas d'exporter la nouvelle fonction
  updateContactStatut
}
