import { Outlet ,useNavigate} from 'react-router';
import Appbar from '../components/Navbar.tsx';
import '../AppbodyStyles.css'
import {  useAtom } from 'jotai';
import {loggedInAtom} from '../main.tsx'
const AppLayout = () => {
  const [loggedIn] = useAtom(loggedInAtom);
  const navigate = useNavigate(); // Initialize useNavigate

  if (!loggedIn) {
    navigate('/'); // Redirect to '/' if not logged in
    return null; // Render nothing
  }
      return (
        <div className='ApplayoutBody'>
          {/* Navbar component */}
          <Appbar />
    
          {/* Content area */}
          <main className="AppBodyMain">
            <Outlet /> {/* Render the content based on the selected route */}
          </main>
    
          <footer>AppLayout Footer</footer>
        </div>
      );
    };

export default AppLayout;
