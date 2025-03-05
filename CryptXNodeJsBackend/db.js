
const { MongoClient, ServerApiVersion } = require('mongodb');
const { ObjectId } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGO_URI; // Fetch from environment variable
if (!uri) {
  throw new Error("MONGO_URI is not set in the environment variables!");
}

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function connectToDb() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  }
  catch{
    run().catch(console.dir);
  }
   finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
    console.log('Not closing the db connection this time');
  }
}

async function insertUser(user) {
  const db = client.db('cryptx'); // Replace 'test' with your database name
  const usersCollection = db.collection('users'); // Replace 'users' with your collection name
  const cryptoWalletsCollection = db.collection('crypto_wallets');
  const existingUser = await usersCollection.findOne({ username: user.username});
  if (existingUser) {
    throw new Error('User already exists with this email.');
  }
   // Create a new crypto wallet document
   const cryptoWallet = {
    BTC: 0,
    ETH: 0,
    LTC: 0
  };
  const cryptoWalletResult = await cryptoWalletsCollection.insertOne(cryptoWallet);

  // Insert the user with the crypto wallet ID reference
  user.userCryptoWalletId = cryptoWalletResult.insertedId;
  user.fiatWallet = 0;
  await usersCollection.insertOne(user);
}

async function findUserByUsername(username) {
  const db = client.db('cryptx'); // Replace 'test' with your database name
  const usersCollection = db.collection('users'); // Replace 'users' with your collection name
  return await usersCollection.findOne({ username });
}
async function updateFiatWallet(client, userId, fiatAmount) {
  const db = client.db('cryptx');
  const usersCollection = db.collection('users');
  
  try {
      await usersCollection.updateOne(
          { _id: userId },
          { $set: { fiatWallet: fiatAmount } }
      );
      return true;
  } catch (error) {
      console.error("Error updating fiat wallet:", error);
      return false;
  }
}
async function fetchUserWalletInfo( userID) {
  const db = client.db('cryptx'); // Change to your database name
  const usersCollection = db.collection('users'); // Change to your users collection name
  const cryptoWalletsCollection = db.collection('crypto_wallets'); // Change to your crypto wallets collection name

  // Fetch user's fiat wallet
  const user = await usersCollection.findOne({ username: userID });
  console.log('user:', user);
  if (!user) {
    throw new Error('User not found');
  }

  // Fetch user's crypto wallet
  const cryptoWallet = await cryptoWalletsCollection.findOne({ _id: new ObjectId(user.userCryptoWalletId) });
  console.log('cryptoWallet:', cryptoWallet);
  if (!cryptoWallet) {
    throw new Error('Crypto wallet not found');
  }

  return { fiatWallet: user.fiatWallet, 'BTC': cryptoWallet.BTC, 'ETH': cryptoWallet.ETH, 'LTC': cryptoWallet.LTC };
}

async function updateUserVerificationStatus(username, verificationStatus) {
  const db = client.db('cryptx'); // Replace 'cryptx' with your database name
  const usersCollection = db.collection('users'); // Replace 'users' with your collection name

  try {
    await usersCollection.updateOne(
      { username },
      { $set: { verificationStatus } }
    );
    return true;
  } catch (error) {
    console.error("Error updating user verification status:", error);
    return false;
  }
}


module.exports = {
  connectToDb,
  insertUser,
  findUserByUsername,
  updateFiatWallet,
  fetchUserWalletInfo,
  updateUserVerificationStatus,
};
