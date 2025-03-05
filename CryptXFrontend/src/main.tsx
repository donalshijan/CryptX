import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import {  createBrowserRouter,createRoutesFromElements, Route, RouterProvider } from 'react-router-dom';
import Login from './components/Login.tsx';
import Signup from './components/Signup.tsx';
import './index.css'
import HomePage from './pages/HomePage.tsx';
import MarketsPage from './pages/MarketsPage.tsx';
import WalletPage from './pages/WalletPage.tsx';
import AccountPage from './pages/AccountPage.tsx';
import PublicLayout from './pages/PublicLayout.tsx';
import AppLayout from './pages/AppLayout.tsx'
import OrdersPage from './pages/OrdersPage.tsx';
import { atom } from 'jotai';

if (localStorage.getItem('loggedIn') === null) {
  localStorage.setItem('loggedIn', 'false');
}
const storedLoggedInState = localStorage.getItem('loggedIn') === 'true';
export const loggedInAtom = atom(storedLoggedInState);
const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route  path="/" element={<PublicLayout/>}>
        <Route path="login" element={<Login />} />
        <Route path="signup" element={<Signup />} />
      </Route> 
      <Route path="/app" element={<AppLayout/>} >
        <Route path='home' element={<HomePage/>}/>
        <Route index element={<HomePage/>}/>
        <Route path='markets' element={<MarketsPage/>}/>
        <Route path='orders' element={<OrdersPage/>}/>
        <Route path='wallet' element={<WalletPage/>}/>
        <Route path='account' element={<AccountPage/>}/>
      </Route>
    </>
  )
);
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
        <RouterProvider router={router} />
          <App />
  </React.StrictMode>,
)

