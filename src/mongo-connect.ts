import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

class MongoConnect {
    public client: any;

    constructor() {
        this.client = new MongoClient(
            `mongodb://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_HOSTNAME}:${process.env.MONGO_PORT}`,
            { useNewUrlParser: true, useUnifiedTopology: true },
        );
    }

    async connect() {
        console.log('Connecting to Mongo...');

        await this.client.connect();

        if (!this.isConnected()) {
            throw Error("Couldn't connect to Mongo");
        }

        console.log('\x1b[32mMongo: connection opened\x1b[0m');

        return this.client;
    }

    isConnected() {
        return this.client && this.client.isConnected();
    }

    async close() {
        await this.client.close();
        console.log('\x1b[32mMongo: connection closed\x1b[0m');
    }
}

export default new MongoConnect();
