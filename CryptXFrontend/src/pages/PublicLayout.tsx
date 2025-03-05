import { LandingPage } from './landingPage';
import { GoogleOAuthProvider } from '@react-oauth/google';
const GoogleOauthClientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID;

const PublicLayout = () => {
  return (
    <div>
      {/* Place any shared header elements for public pages */}
      <header>
        {/* Add navigation links specific to public pages */}
      </header>

      {/* Render the page content */}
      <main>
      <GoogleOAuthProvider clientId={GoogleOauthClientId}>
          <LandingPage/>
      </GoogleOAuthProvider>
      </main>

      {/* Place any shared footer elements for public pages */}
      <footer>
        <p>Landing Page Footer</p>
      </footer>
    </div>
  );
};

export default PublicLayout;
