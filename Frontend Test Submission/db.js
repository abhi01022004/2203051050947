const { MongoClient } = require("mongodb");
require("dotenv").config();

const client = new MongoClient(process.env.MONGO_URI);

async function connectDB() {
  await client.connect();
  console.log("✅ MongoDB Connected");
  return client.db();
}

module.exports = connectDB;
