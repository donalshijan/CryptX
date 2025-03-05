const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGO_URI; // Fetch from environment variable
if (!uri) {
  throw new Error("MONGO_URI is not set in the environment variables!");
}
const client = new MongoClient(uri);

// User Schema
const userSchema = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['username', 'password',],
    properties: {
      username: {
        bsonType: 'string',
        description: 'must be a string and is required'
      },
      password: {
        bsonType: 'string',
        description: 'must be a string and is required'
      },
      firstName: {
        bsonType: 'string',
        description: 'must be a string and is required'
      },
      lastName: {
        bsonType: 'string',
        description: 'must be a string and is required'
      },
    }
  }
};

module.exports = userSchema;

async function setupSchema() {
  try {
    await client.connect();

    const db = client.db('cryptx');
    const collectionOptions = {
      validator: userSchema,
    };

    await db.createCollection('users', collectionOptions);
    console.log('Collection "users" with schema created successfully.');
  } finally {
    await client.close();
  }
}

setupSchema().catch(console.error);
