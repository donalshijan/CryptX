import { useState } from 'react';
import axios from 'axios';
import jwtDecode from 'jwt-decode';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import "../styles/LoginComponentStyles.css"
import {  useAtom } from 'jotai';
import {loggedInAtom} from '../main.tsx'

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loggedIn, setLoggedIn] = useAtom(loggedInAtom);
  const navigate = useNavigate(); // Initialize useNavigate

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post('http://localhost:3000/login', {
        username: email,
        password: password,
        loginType: 'NotGoogleOAuth',
      });

      // Assuming the server returns a token upon successful login
      const token = response.data.token;

      // Check if the token is valid (not expired) before storing it in local storage
      if (isTokenValid(token)) {
        localStorage.setItem('jwtToken', token);
        localStorage.setItem('loginType', 'NotGoogleOAuth');
        console.log('Logged in successfully! Token:', token);
        setLoggedIn(true);
        localStorage.setItem('loggedIn', 'true');
        // Redirect to the '/home' URL after successful login
        navigate('/app/home');
      } else {
        console.error('Login failed. Token is invalid or expired.');
      }
    } catch (error) {
      console.error('Login failed. Error:', error.message);
    }
  };

  // Function to check if the token is valid (not expired)
  const isTokenValid = (token) => {
    try {
      const decodedToken = jwtDecode(token);
      return decodedToken.exp * 1000 > Date.now();
    } catch (error) {
      return false;
    }
  };

  return (
    <div className="login-div">
      <h2>Login</h2>
      <form className="login-form" onSubmit={handleLogin}>
        <div>
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
        </div>
        <div>
            <label htmlFor="password">Password:</label>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
        </div>
        
        <button type="submit">Login</button>
        
      </form>
    </div>
  );
};

export default Login;
