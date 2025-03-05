import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import "../styles/LandingPageStyles.css";
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import jwtDecode from 'jwt-decode';
import {  useAtom } from 'jotai';
import {loggedInAtom} from '../main.tsx'
export function LandingPage() {
  const [loggedIn, setLoggedIn] = useAtom(loggedInAtom);
  const location = useLocation();
  const isHomePage = location.pathname === "/";
  const navigate = useNavigate();
  const responseGoogle = (response) => {
  const base64Url = response.credential.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
    const { name, picture, sub, email } = JSON.parse(jsonPayload)
    const doc = {
      _id: sub,
      _type: 'user',
      userName: name,
      image: picture,
      email: email

      };
    // i think it should be doc._id that needs to be set to local storage but i dont know what this is for 
    // localStorage.setItem('user', JSON.stringify(response.sub)); 
    // console.log(JSON.stringify(doc._id))
    loginUserOrCreateAndLoginUserIfNotExists(doc);
  };
  const loginUserOrCreateAndLoginUserIfNotExists = async (doc) => {
    try {
      const response = await axios.post('http://localhost:3000/login', {
        username: doc.email,
        loginType: 'GoogleOAuth',
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
        localStorage.setItem('loginType', 'GoogleOAuth');
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
  }
  return (
    <>
      <nav className="landing-page-nav">
        <h1><NavLink to="/">CryptX</NavLink></h1>
        <ul>
          <li className="landing-Page-nav-item">
            <NavLink to="login">Login</NavLink>
          </li>
          <li className="landing-Page-nav-item">
            <NavLink to='signup'>Signup</NavLink>
          </li>
        </ul>
      </nav>
      <main className="landing-page-main">
        {isHomePage && <h3>Login or SignUp to Continue</h3> }
        <Outlet />
         {!isHomePage && <GoogleLogin  onSuccess={credentialResponse => {responseGoogle(credentialResponse)}} onError={() => {console.log('Login Failed');}}/>}
        
      </main>
    </>
  );
}