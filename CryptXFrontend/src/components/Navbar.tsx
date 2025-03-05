
import { useState, useEffect, useRef, useContext } from 'react';
import { CSSTransition } from 'react-transition-group';
import '../Navbar.css';
import ArrowIcon from '@mui/icons-material/KeyboardBackspaceTwoTone';
import ChevronIcon from '@mui/icons-material/ChevronRightTwoTone';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PasswordIcon from '@mui/icons-material/Password';
import BadgeIcon from '@mui/icons-material/Badge';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import { googleLogout  } from '@react-oauth/google';
import { NavLink, useNavigate } from 'react-router-dom';
import SecurityIcon from '@mui/icons-material/Security';
import { IndicatorPositionContext } from './IndicatorPositionContext.ts';
import SettingsIcon from '@mui/icons-material/Settings';
import verifyIcon from '../assets/icons/verifyicon.png';
import unverifiedIcon from '../assets/icons/unverifiedIcon.png';
import Modal from './Modal.tsx'; 
import { loggedInAtom } from '../main.tsx';
import { useAtom } from 'jotai';
import axios from 'axios';

function Appbar() {
  const [loggedIn, setLoggedIn] = useAtom(loggedInAtom);
  const navigate = useNavigate(); // Initialize useNavigate
    const [showMenu, setShowMenu] = useState(false);
    const [verificationStatus, setVerificationStatus] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
  
    useEffect(() => {
      const fetchVerificationStatus = async () => {
        try {
          const token = localStorage.getItem('jwtToken');
          const response = await axios.get('http://localhost:3000/getUserVerificationStatus', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          setVerificationStatus(response.data.verificationStatus);
        } catch (error) {
          console.error('Error fetching verification status:', error);
        }
      };
  
      fetchVerificationStatus();
    }, []);
  
    const toggleMenu = () => {
            setShowMenu(!showMenu);
            const navbar = document.querySelector('.navbar');
            if (navbar) {
                if (navbar.style.display === 'none' || !navbar.style.display) {
                    navbar.style.display = 'block';
                } else {
                    navbar.style.display = 'none';
                }
            }
        };
        const [indicatorPosition, setIndicatorPosition] = useState({
          left: 0,
          width: 0 ,
          top: 0,
          right:0,
          bottom:0
      });
      const handleLogout = () => {
        // Your logout logic here
        const loginType = localStorage.getItem('loginType');
    
    // Common logout steps
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('loginType');
    setLoggedIn(false);
    
    // Specific logout steps based on login type
    if (loginType === 'GoogleOAuth') {
      // Perform Google OAuth specific logout steps
      const auth2 = window.gapi.auth2.getAuthInstance();
      if (auth2) {
        auth2.signOut().then(() => {
          console.log('Google user signed out.');
        });
      }
    } else if (loginType === 'NotGoogleOAuth') {
      // Perform custom login specific logout steps if needed
      console.log('Custom login user signed out.');
    }
    
    // Redirect to login or home page
    navigate('/');
      };
      const handleNavItemClick = (event) => {
        const targetNavItem = event.currentTarget;
        event.currentTarget.classList.add('active');
        const { left , right} = targetNavItem.getBoundingClientRect();
        const navbarRect = document.querySelector('.navbar').getBoundingClientRect();

        const beforeElementLeft = navbarRect.left;
        const beforeElementWidth = left- navbarRect.left;
        const afterElementLeft = right;
        const afterElementWidth = navbarRect.right-right;
        document.documentElement.style.setProperty('--beforeElementWidth', `${beforeElementWidth}px`);
        document.documentElement.style.setProperty('--afterElementWidth', `${afterElementWidth}px`);
        document.documentElement.style.setProperty('--beforeElementLeft', `${beforeElementLeft}px`);
        document.documentElement.style.setProperty('--afterElementLeft', `${afterElementLeft}px`);
        
      };
      const handleVerificationClick = () => {
        if (verificationStatus === 'unverified') {
          setIsModalOpen(true);
        }
      };
    return (
        <>
            {/* Hamburger Icon*/}
            <div className="hamburger-icon" onClick={toggleMenu}>
            <div className={`hamburger ${showMenu ? "active" : ""}`}>
                <span></span>
                <span></span>
                <span></span>
            </div>
            </div>
    
            {/* Navbar */}
        <IndicatorPositionContext.Provider value={indicatorPosition}>
         <Navbar showMenu={showMenu}>
                <NavItem toURL='home' navName="Home" onClick={handleNavItemClick} >
                </NavItem>
                <ul className="middle-nav" >
                    <NavItem  data-middle-nav toURL='markets' navName='Markets' onClick={handleNavItemClick} >
                    </NavItem>
                    <NavItem  data-middle-nav toURL='orders' navName='Orders' onClick={handleNavItemClick} >
                    </NavItem>
                      <NavItem  data-middle-nav toURL='wallet' navName="Wallet"  onClick={handleNavItemClick} >
                    </NavItem>
                </ul>    
                <NavItem  data-dropdown-menu handleLogout={handleLogout} verificationStatus={verificationStatus} handleVerificationClick={handleVerificationClick}>
                </NavItem>
          </Navbar>
        </IndicatorPositionContext.Provider>
        {isModalOpen && (
        <Modal onClose={() => setIsModalOpen(false)}>
          
        </Modal>
      )}
      </>
    );
  }
  function IconComponent(props){
      return(
          <>
            <img src={props.iconURL} alt="Logo" />
          </>
      )
  }
function Navbar(props) {
  const indicatorPosition = useContext(IndicatorPositionContext);
    return (
      <>
      <nav className="navbar">
        
        <ul className="navbar-nav">{props.children}</ul>
      </nav>
      <div className={`active-link-indicator `}
                        style={{left: `${indicatorPosition.left}px`,width: `${indicatorPosition.width}px`, top: `${indicatorPosition.top}`}}>  
                      </div>
      </>
      
    );
  }

  
  
  function NavItem(props) {
    const [open, setOpen] = useState(false);   
    const handleClickForNavItem = () => {
            setOpen(!open)
    }
    const closeNavItem = () =>{
            setOpen(false)
    }
    const isActive = props.toURL && location.pathname.includes(props.toURL);
    return (
        <li className={`nav-item ${isActive ? 'active' : ''}`}  >
        {props['data-dropdown-menu'] ? ( // Conditionally render based on data-dropdown-menu
          <>
            <ManageAccountsIcon to={props.toURL} className="navbar-icon" id="DropdownIcon" onClick={(e) => handleClickForNavItem(e)}/>
            {open && <DropdownMenu closeDropDown={closeNavItem} handleLogout={props.handleLogout} verificationStatus={props.verificationStatus} handleVerificationClick={props.handleVerificationClick}/>}
          </>
        ) : (
          <NavLink to={props.toURL} className="navbar-link-button"  onClick={props.onClick}>
            {props.navName && <div>{props.navName}</div> }
          </NavLink>
        )}
      </li>
    );
  }

  function DropdownMenu({closeDropDown,handleLogout,verificationStatus, handleVerificationClick}) {
    const [activeMenu, setActiveMenu] = useState('main');
    const [menuHeight, setMenuHeight] = useState(null);
    const dropdownRef = useRef(null);
    
    function isDescendant(parent, child) {
        let node = child.parentNode;
        while (node !== null) {
          if (node === parent) {
            return true;
          }
          node = node.parentNode;
        }
        return false;
      }

    useEffect(() => {
      setMenuHeight(dropdownRef.current?.firstChild.offsetHeight)
      const handleClickOutside = (event) => {
        //   console.log(isDescendant(dropdownRef.current, event.target))
        if (dropdownRef.current && !isDescendant(dropdownRef.current, event.target)) {

          setActiveMenu('main'); // Close the dropdown menu when clicking outside\
          closeDropDown();
        }
      };
  
      // Add event listener when the component mounts
      document.addEventListener('mouseup', handleClickOutside);
  
      // Clean up the event listener when the component unmounts
      return () => {
        document.removeEventListener('mouseup', handleClickOutside);
      };
    }, [])
  
    function calcHeight(el) {
      const height = el.offsetHeight;
      setMenuHeight(height);
    }
  
    function DropdownItem(props) {
      
      const handleClick = () => {
        if (props.goToMenu) {
          setActiveMenu(props.goToMenu);
        }
        if (props.onClick) {
          props.onClick();
        }
      };
      return (
        <a href="#" className="menu-item" onClick={handleClick}>
            <span className="left-icon">{props.leftIcon}</span>
          {props.children}
          <span className="right-icon">{props.rightIcon}</span>
        </a>
      );
    }

    return (
      <div className="dropdown" style={{ height: menuHeight }} ref={dropdownRef}>
  
        <CSSTransition
          in={activeMenu === 'main'}
          timeout={500}
          classNames="menu-primary"
          unmountOnExit
          onEnter={calcHeight}>
          <div className="menu">
            <DropdownItem leftIcon={<AccountCircleIcon/>} rightIcon={<ChevronIcon />} goToMenu="account">Account</DropdownItem>
            <DropdownItem
              leftIcon={<SettingsIcon/>}
              rightIcon={<ChevronIcon />}
              goToMenu="settings">
              Settings
            </DropdownItem>
            <DropdownItem
              leftIcon={<LogoutIcon/>} 
              onClick={handleLogout}
            >
              Logout
            </DropdownItem>
  
          </div>
        </CSSTransition>
  
        <CSSTransition
          in={activeMenu === 'settings'}
          timeout={500}
          classNames="menu-secondary"
          unmountOnExit
          onEnter={calcHeight}>
          <div className="menu">
            <DropdownItem goToMenu="main" leftIcon={<ArrowIcon />}>
              <h2>Settings</h2>
            </DropdownItem>
            <DropdownItem leftIcon={<PasswordIcon/>}>Change Password</DropdownItem>
            <DropdownItem leftIcon={<SecurityIcon/>}>Enable 2FA</DropdownItem>
          </div>
        </CSSTransition>
  
        <CSSTransition
          in={activeMenu === 'account'}
          timeout={500}
          classNames="menu-secondary"
          unmountOnExit
          onEnter={calcHeight}>
          <div className="menu">
            <DropdownItem goToMenu="main" leftIcon={<ArrowIcon />}>
              <h2>Account</h2>
            </DropdownItem>
            <DropdownItem leftIcon={<BadgeIcon/>}>My Profile</DropdownItem>
            <DropdownItem
            leftIcon={
              verificationStatus === 'unverified' ? (
                <img src={unverifiedIcon} alt="Unverified Icon" className="icon-image" />
              ) : (
                <img src={verifyIcon} alt="Verified Icon" className="icon-image" />
              )
            }
            onClick={verificationStatus === 'unverified' ? handleVerificationClick : null}
          >
            Verification Status
          </DropdownItem>
            <DropdownItem leftIcon={<AccountBalanceIcon/>}>Linked Bank Accounts</DropdownItem>
          </div>
        </CSSTransition>
      </div>
    );
  }
  export default Appbar;