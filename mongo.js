const { MongoClient } = require('mongodb');
require('dotenv').config();

class MongoBot {
  constructor() {
    this.client = new MongoClient(
      `mongodb://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@127.0.0.1:27017`,
      { useNewUrlParser: true, useUnifiedTopology: true }
    );
  }

  async connect() {
    await this.client.connect();
    console.log('\x1b[32mMongo: connection opened\x1b[0m');
    return this.client;
  }

  isConnected() {
    return !!this.client && this.client.isConnected();
  }

  async close() {
    await this.client.close();
    console.log('\x1b[32mMongo: connection closed\x1b[0m');
  }
}

module.exports = new MongoBot();