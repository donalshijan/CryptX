const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const app = express();
const db = require('./db'); // Import the database module
const cors = require('cors');
const amqp = require('amqplib');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
require('dotenv').config();
const startConsumer = require('./consumer');
// Enable CORS for all routes
app.use(cors());

// Middleware to parse incoming JSON data
app.use(bodyParser.json());
db.connectToDb();

// Set up multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Dummy user data (you'll need to connect to a real database later)
const users = [];

// Register new user
app.post('/signup', async (req, res) => {
  try {
    const {signupType} = req.body;
    const { username, password } = req.body;
    if (signupType==='NotGoogleOAuth'){
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Insert the user into the "users" collection using the db.js method
      await db.insertUser({ username, password: hashedPassword,signupType:signupType,verificationStatus: 'unverified'});
  
      res.status(201).json({ message: 'User registered successfully.' });
    }
    if (signupType==='GoogleOAuth'){
      const { username } = req.body;
      // Insert the user into the "users" collection using the db.js method
      await db.insertUser({ username,signupType:signupType,verificationStatus: 'unverified'});
  
      res.status(201).json({ message: 'User registered successfully.' });
    }
    
  } catch (error) {
    if (error.message === 'User already exists with this email.') {
      res.status(400).json({ error: 'User already exists with this email.' });
    } else {
      res.status(500).json({ error: 'An error occurred during registration.' });
    }
  }
});

// Login user
app.post('/login', async (req, res) => {
  try {
    const { loginType } = req.body;
    const { username, password } = req.body;
    if (loginType ==='NotGoogleOAuth'){
      // Find the user by username from the "users" collection using the db.js method
      const user = await db.findUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: 'username does not exist' });
      }
      else if(user.signupType==='GoogleOAuth'){
        return res.status(401).json({ error: 'User has signed up using google sign in' });
      }
   
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials.' });
      }
    }
    if (loginType==='GoogleOAuth'){
      const { username } = req.body;
      const user = await db.findUserByUsername(username);
      if (!user) {
        try {
          // Make the POST request to the server
          await axios.post('http://localhost:3000/signup', {
            username,
            signupType: 'GoogleOAuth',
          });
          
          // Handle successful signup here (e.g., redirect to a success page)
          console.log('Signup successful!');
          
        } catch (error) {
          // Handle error if signup fails (e.g., display error message)
          console.error('Error during signup:', error.message);
        }
      }
      else if(user.signupType==='NotGoogleOAuth'){
        return res.status(401).json({ error: 'User has Signed up using custom signup' });
      }
    }
    // Generate JWT token
    const token = jwt.sign({ username }, 'potato',{ expiresIn: '1h' });
    res.json({ token }); // Sending the token back as a JSON response
    console.log('response',token);
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: 'An error occurred during login.' });
  }
});
app.get('/getUserFiatWalletAndCryptoWalletInfo', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header missing' });
    }

    const token = authHeader.split(' ')[1]; // Extract the token from the header
    const decodedToken = jwt.verify(token, 'potato'); // Verify the token

    const username = decodedToken.username; // Extract the username from the token payload
    console.log(username)
    // Call the fetchUserWalletInfo function to get wallet info, passing the username
    const walletInfo = await db.fetchUserWalletInfo(username);

    // Send the wallet info back as JSON response
    console.log(walletInfo)
    res.json(walletInfo);
  } catch (error) {
    console.error('Error fetching wallet info:', error);
    res.status(500).json({ error: 'An error occurred while fetching wallet info.' });
  }
});

// Fetch user's verification status
app.get('/getUserVerificationStatus', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header missing' });
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = jwt.verify(token, 'potato');

    const username = decodedToken.username;
    console.log(username);
    const user = await db.findUserByUsername(username);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ verificationStatus: user.verificationStatus });
  } catch (error) {
    console.error('Error fetching verification status:', error);
    res.status(500).json({ error: 'An error occurred while fetching verification status.' });
  }
});

// Verify user's details and send to message queue
app.post('/verifyUserDetails', upload.single('idPhoto'),async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header missing' });
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = jwt.verify(token, 'potato');

    const username = decodedToken.username;
    const { firstName, lastName, address } = req.body;
    // const idPhoto = req.file.buffer.toString('base64'); 
    const idPhotoBuffer = req.file.buffer;
    const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
    const connection = await amqp.connect(rabbitmqUrl);
    const channel = await connection.createChannel();
    await channel.assertQueue('user_verification_queue');

    const message = {
      metadata: {
        username,
        firstName,
        lastName,
        address,
      },
      image: idPhotoBuffer.toString('base64'),
    };
    const messageBuffer = Buffer.from(JSON.stringify(message));
    channel.sendToQueue('user_verification_queue', Buffer.from(JSON.stringify(messageBuffer)));
    console.log("Message sent to queue:", messageBuffer);

    res.status(200).json({ message: 'Verification request submitted.' });
  } catch (error) {
    console.error('Error submitting verification request:', error);
    res.status(500).json({ error: 'An error occurred while submitting verification request.' });
  }
});

const port = 3000;
app.listen(port, async () => {
  console.log(`Server is running on http://localhost:${port}`);
  // Start the consumer
  const consumerChannel = await startConsumer();
  console.log('RabbitMQ consumer started.');
});
