import { Routes, Route, useLocation } from 'react-router-dom';
import Nav from './components/Nav';
import HomePage from './components/Homepage';
import Registration from './components/Registration';
import Dashboard from './components/Dashboard';
import Skills from './components/Skills/Skills';
import LoginPage from './components/Login';
import ProfilePage from './components/ProfilePage';
import ProfileForm from './components/ProfileForm';
import Logout from './components/Logout';
import Education from './components/Education/Education';
import AuthCallback from './components/AuthCallback';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import PrivateRoute from './components/PrivateRoute';
import Certifications from './components/Certifications/Certifications';

import './App.css';

function App() {
  const location = useLocation();
  const hideNavbarRoutes = ["/Login", "/Registration", "/forgot-password", "/reset-password"];
  const showNavbar = !hideNavbarRoutes.includes(location.pathname);

  return (
    <>
      {showNavbar && <Nav />}
      <div className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/Registration" element={<Registration />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/Dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} /> {/* Protected Routes */}
          <Route path="/Skills" element={<PrivateRoute><Skills /></PrivateRoute>} />{/* Protected Routes */}
          <Route path="/Login" element={<LoginPage />} />
          <Route path="/ProfilePage" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />{/* Protected Routes */}
          <Route path="/ProfileForm" element={<PrivateRoute><ProfileForm /></PrivateRoute>} />{/* Protected Routes */}
          <Route path="/ProfileForm/:id" element={<PrivateRoute><ProfileForm /></PrivateRoute>} />
          <Route path="/Logout" element={<Logout />} />
          <Route path="/Education" element={<PrivateRoute><Education /></PrivateRoute>} />{/* Protected Routes */}
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/Education" element={<PrivateRoute><Education /></PrivateRoute>} />{/* Protected Routes */}
          <Route path="/Certifications" element={<Certifications />} />
        </Routes>
      </div>
    </>
  );
}

export default App;