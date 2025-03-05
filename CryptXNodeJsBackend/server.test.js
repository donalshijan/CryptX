const request = require('supertest');
const app = require('./Server'); 
const FormData = require('form-data');

describe('User Registration Tests', () => {
  it('should register a new user with custom signup', async () => {
    const newUser = {
      signupType: 'NotGoogleOAuth',
      username: 'testuser@gmail.com',
      password: 'Testpassword@123',
    };

    const response = await request(app)
      .post('/signup')
      .send(newUser)
      .expect(201);

    expect(response.body.message).toBe('User registered successfully.');
  });

  it('should register a new user with Google OAuth', async () => {
    const newUser = {
      signupType: 'GoogleOAuth',
      username: 'googleuser',
    };

    const response = await request(app)
      .post('/signup')
      .send(newUser)
      .expect(201);

    expect(response.body.message).toBe('User registered successfully.');
  });

  it('should return error for existing user', async () => {
    const existingUser = {
      signupType: 'NotGoogleOAuth',
      username: 'testuser@gmail.com',
      password: 'Testpassword@123',
    };

    const response = await request(app)
      .post('/signup')
      .send(existingUser)
      .expect(400);

    expect(response.body.error).toBe('User already exists with this email.');
  });
});

describe('User Login Tests', () => {
  it('should login with custom credentials', async () => {
    const credentials = {
      loginType: 'NotGoogleOAuth',
      username: 'testuser@gmail.com',
      password: 'Testpassword@123',
    };

    const response = await request(app)
      .post('/login')
      .send(credentials)
      .expect(200);

    expect(response.body.token).toBeDefined();
  });

  it('should login with Google OAuth', async () => {
    const credentials = {
      loginType: 'GoogleOAuth',
      username: 'googleuser',
    };

    const response = await request(app)
      .post('/login')
      .send(credentials)
      .expect(200);

    expect(response.body.token).toBeDefined();
  });

  it('should return error for invalid credentials', async () => {
    const invalidCredentials = {
      loginType: 'NotGoogleOAuth',
      username: 'testuser@gmail.com',
      password: 'wrongpassword',
    };

    const response = await request(app)
      .post('/login')
      .send(invalidCredentials)
      .expect(401);

    expect(response.body.error).toBe('Invalid credentials.');
  });
});

describe('Integration Tests for Server Endpoints', () => {
    let serverUrl = 'http://localhost:3000'; // Replace with your actual server URL
    let token;

    // Login the test user to get a valid JWT token
    beforeAll(async () => {
      try {
        const response = await axios.post(`${serverUrl}/login`, {
          username: 'testuser@gmail.com',
          password: 'Testpassword@123', // Use the password set during signup in the previous test
          loginType: 'NotGoogleOAuth',
        });
        token = response.data.token;
      } catch (error) {
        throw error;
      }
    });


    // Test for '/getUserFiatWalletAndCryptoWalletInfo' endpoint
    it('should fetch user wallet info', async () => {
  
      try {
        const response = await axios.get(`${serverUrl}/getUserFiatWalletAndCryptoWalletInfo`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
  
        expect(response.status).toBe(200);
        // Add more assertions as needed to validate the response structure and data
      } catch (error) {
        // Handle errors or assertion failures
        throw error;
      }
    });
  
    // Test for '/getUserVerificationStatus' endpoint
    it('should fetch user verification status', async () => {
  
      try {
        const response = await axios.get(`${serverUrl}/getUserVerificationStatus`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
  
        expect(response.status).toBe(200);
        // Add more assertions as needed to validate the response structure and data
      } catch (error) {
        // Handle errors or assertion failures
        throw error;
      }
    });
  
    // Test for '/verifyUserDetails' endpoint
    it('should submit user verification details', async () => {
  
      try {
        const formData = new FormData();
        formData.append('idPhoto', Buffer.from('sample_image_data'), {
          filename: 'sample.jpg',
          contentType: 'image/jpeg',
        });
        formData.append('firstName', 'John');
        formData.append('lastName', 'Doe');
        formData.append('address', '123 Main St, Anytown, USA');
  
        const response = await axios.post(`${serverUrl}/verifyUserDetails`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            ...formData.getHeaders(),
          },
        });
  
        expect(response.status).toBe(200);
        // Add more assertions as needed to validate the response structure and data
      } catch (error) {
        // Handle errors or assertion failures
        throw error;
      }
    });
  });
