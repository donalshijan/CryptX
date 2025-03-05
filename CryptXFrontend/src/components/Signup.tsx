import  { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {  useAtom } from 'jotai';
import {loggedInAtom} from '../main.tsx'

import "../styles/LoginComponentStyles.css"
import jwtDecode from 'jwt-decode';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState(''); // New state
  const [animateError, setAnimateError] = useState(false);
  const [loggedIn, setLoggedIn] = useAtom(loggedInAtom);
  useEffect(() => {
    if (animateError) {
      const timer = setTimeout(() => setAnimateError(false), 200); // Reset animation state after animation duration
      return () => clearTimeout(timer);
    }
  }, [animateError]);
  const navigate = useNavigate(); // Initialize useNavigate
  const handleSignup =  async (e) => {
    e.preventDefault();
    
    // Validate the password using regex
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{10,}$/;
    setPasswordError('')
    setConfirmPasswordError('')
    if (!passwordRegex.test(password)) {
      setPasswordError('Password must be at least 10 characters long and contain one special character, one digit, and one capital letter.');
      setAnimateError(true);
      return;
    }
    
    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match.');
      setAnimateError(true);
      return;
    }
    try {
      // Make the POST request to the server
      const response = await axios.post('http://localhost:3000/signup', {
        firstName,
        lastName,
        username: email,
        password,
        signupType: 'NotGoogleOAuth',
      });
      
      // Handle successful signup here (e.g., redirect to a success page)
      console.log('Signup successful!');
      try {
        const response = await axios.post('http://localhost:3000/login', {
          username: email,
          password: password,
          loginType: 'NotGoogleOAuth',
        });
  
        // Assuming the server returns a token upon successful login
        const token = response.data.token;
        // Function to check if the token is valid (not expired)
  const isTokenValid = (token) => {
    try {
      const decodedToken = jwtDecode(token);
      return decodedToken.exp * 1000 > Date.now();
    } catch (error) {
      return false;
    }
  };
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
    } catch (error) {
      // Handle error if signup fails (e.g., display error message)
      console.error('Error during signup:', error.message);
    }
  };

  return (
    <>
      <div className="login-div">
        <h2>Signup</h2>
        <form className="login-form" onSubmit={handleSignup}>
          <div>
            <label htmlFor="firstName">First Name:</label>
            <input
              type="text"
              placeholder="First"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="lastName">Last Name:</label>
            <input
              type="text"
              placeholder="Last"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
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
          <div>
            <label htmlFor="confirmPassword">Confirm Password:</label>
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ border: confirmPasswordError ? '1px solid red' : '' }}
            />
          </div>
          {confirmPasswordError && (<div className={` ${animateError ? 'animate-message' : 'error-message'}`}>{confirmPasswordError}</div>)}
          {passwordError && <div className={` ${animateError ? 'animate-message' : 'error-message'}`}>{passwordError}</div>}
          <button type="submit">Signup</button>
        </form>
      </div>
    </>
  );
};

export default Signup;
