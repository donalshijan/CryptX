const http = require('http');
const WebSocket = require('ws');
const { Client } = require('pg');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const url = require('url');
// Create a MongoDB client
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGO_URI; // Fetch from environment variable
if (!uri) {
  throw new Error("MONGO_URI is not set in the environment variables!");
}

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const mongoClient = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function connectToDb() {
    try {
      // Connect the client to the server	(optional starting in v4.7)
      await mongoClient.connect();
      // Send a ping to confirm a successful connection
      await mongoClient.db("admin").command({ ping: 1 });
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
// Create an HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket server is running.');
});
connectToDb();
// Create a WebSocket server by passing the HTTP server as an argument
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', async (ws, request) => {
  console.log('wss.on(connection) ran')
  // Extract userId from request URL or headers
  const userId = getUserIdFromRequest(request);

  // Add the WebSocket connection to a specific user's connections
  addUserWebSocket(userId, ws);
  const subprotocol = request.headers['sec-websocket-protocol'];

  if (subprotocol === 'order') {
    console.log('checking for sub protocol order ran')
    // Create a PostgreSQL client
const pgClient = new Client({
  user: 'postgres',
  host: 'postgresdb',
  database: 'cryptx',
  password: 'postgres',
  port: 5432,
  ssl: false,
});
pgClient.connect();
const activeOrders = [];
const fulfilledOrders = [];
// Fetch active and fulfilled orders for the user
try {
  const token = getAuthTokenFromRequest(request); // Replace this with how you obtain the token
  const response = await axios.get('http://gobackend:8080/fetchActiveAndFulfilledOrders', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    params: {
      username: userId, // Pass the userId as a parameter
    },
  });
  console.log(response.data)
  const { activeOrders : activeOrdersArray, fulfilledOrders : fulfilledOrdersArray } = response.data;
  // Update active and fulfilled orders arrays with the fetched data
  activeOrders.push(...activeOrdersArray);
  fulfilledOrders.push(...fulfilledOrdersArray);
  const ordersToSend = {
    activeOrders,
    fulfilledOrders,
  };
  ws.send(JSON.stringify(ordersToSend));
} catch (error) {
  console.error('Error fetching orders:', error);
  // Handle error appropriately
}
    // Logic for order tracking connection
    // Watch for changes in the orders table's data
  const orderChangeStream = pgClient.query('LISTEN orders_update');
  pgClient.on('notification', async change => {
    const notificationPayload = JSON.parse(change.payload);
    const { tableName, data } = notificationPayload;
  
    if (tableName === 'crypto.orders' || tableName === 'crypto.fulfilled_orders') {
      // Check if the updated order belongs to the connected user
      if (data.userId === userId) {
        // Determine if the order is active or fulfilled
        if(data.deleted){
          try {
            const token = getAuthTokenFromRequest(); // Replace this with how you obtain the token
            const response = await axios.get('http://gobackend:8080/fetchActiveAndFulfilledOrders', {
              headers: {
                Authorization: `Bearer ${token}` ,
              },
              params: {
                username: userId, // Pass the userId as a parameter
              },
            });
          
            const { activeOrdersArray, fulfilledOrdersArray } = response.data;
            activeOrders=activeOrdersArray; 
            fulfilledOrders=fulfilledOrdersArray;
          } catch (error) {
            console.error('Error fetching orders:', error);
            // Handle error appropriately
          }
        }
        else{
          const targetArray = data.created_date ? activeOrders : fulfilledOrders;
                // Find the index of the order in the target array
          const existingIndex = targetArray.findIndex(order => order.order_id === data.order_id);
        
              if (existingIndex !== -1) {
                // Update the existing order in the array with the new data
                targetArray[existingIndex] = data;
              } else {
                // Add the new order to the array
                targetArray.push(data);
              }
        }
  
        // Send the updated order data to the client
        const ordersToSend = {
          activeOrders,
          fulfilledOrders,
        };
  
        // Send the combined orders to the client
        ws.send(JSON.stringify(ordersToSend));
      }
    }
  });
  setInterval(() => {
    ws.send('seems like no change in orders so far');
  }, 5000); // Send updates every 5 seconds (adjust the interval as needed)
  } 
  else if (subprotocol === 'wallet') {
     console.log('checking for sub protocol wallet ran')
    // Establish a MongoDB connection
    try {
      // Connect the client to the server	(optional starting in v4.7)
      await mongoClient.connect();
      // Send a ping to confirm a successful connection
      await mongoClient.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
    }
    catch{
      console.log('inside catch')
      run().catch(console.dir);
    }

      // Watch for changes in the users collection's fiatWallet field
      const userCollection = mongoClient.db('cryptx').collection('users');
      const userDocumentId = await userCollection.find({ username:  userId}, { projection: { _id: 1 } }).toArray();
      console.log(userDocumentId[0]._id);
      console.log(userCollection)
      const userChangeStream = userCollection.watch([
        {
          '$match': {
            'operationType':'update',
            'documentKey._id':userDocumentId[0]._id,
            'updateDescription.updatedFields.fiatWallet':{ $exists: true }
        }
      }
    ]);
      // console.log(userChangeStream)
      console.log(userId)
      // console.log('tomato',userCollection)
      userChangeStream.on('change', async change => {
          const updatedFiatWallet = change.updateDescription.updatedFields.fiatWallet;
          ws.send(JSON.stringify(updatedFiatWallet));
          });
          setInterval(() => {
            ws.send('seems like no change so far');
          }, 5000); // Send updates every 5 seconds (adjust the interval as needed)
  }


  ws.on('message', message => {
    console.log(`Received message from user ${userId}: ${message}`);
    // Handle client messages as needed
  });

  ws.on('close', () => {
    console.log('websocket closed')
    // Remove the WebSocket connection when closed
    removeUserWebSocket(userId, ws);
  });
});

// Handle HTTP upgrade requests for WebSocket connections
server.on('upgrade', (request, socket, head) => {
  console.log('server.on(upgrade) ran')
  wss.handleUpgrade(request, socket, head, ws => {
    console.log('wss.handleupgrade()ran')
    wss.emit('connection', ws, request);
  });
});

// Start the HTTP server on port 3000
server.listen(3001, () => {
  console.log('WebSocket server is listening on port 3001.');
});

// Example functions for managing user WebSocket connections
const userConnections = new Map();

function getUserIdFromRequest(request) {
    const query = url.parse(request.url, true).query;
    const token = query.token;

    if (!token) {
        throw new Error('Token missing in query parameters');
    }

    try {
        const decodedToken = jwt.verify(token, 'potato'); // Verify the token
        const userId = decodedToken.username; // Assuming userId is present in the token payload
        return userId;
    } catch (error) {
        throw new Error('Invalid token');
    }
}
function getAuthTokenFromRequest(request) {
  const query = url.parse(request.url, true).query;
  const token = query.token;
  try{
    if (!token) {
      throw new Error('Token missing in query parameters');
    }
    return token
  }
  catch (error){
    console.log(error)
  }
}
function addUserWebSocket(userId, ws) {
  if (!userConnections.has(userId)) {
    userConnections.set(userId, []);
  }
  userConnections.get(userId).push(ws);
}

function removeUserWebSocket(userId, ws) {
  if (userConnections.has(userId)) {
    const userWsList = userConnections.get(userId);
    const index = userWsList.indexOf(ws);
    if (index !== -1) {
      userWsList.splice(index, 1);
      if (userWsList.length === 0) {
        userConnections.delete(userId);
      }
    }
  }
}
