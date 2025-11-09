import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Nav from './components/Nav';
import HomePage from './components/Homepage';
import Registration from './components/Registration';
import Dashboard from './components/Dashboard';
import Skills from './components/Skills/Skills';
import LoginPage from './components/Login_Logout/Login';
import ProfileDashboard from './components/Profile/ProfileDashboard';
import ProfilePage from './components/Profile/ProfilePage';
import ProfileForm from './components/Profile/ProfileForm';
import Logout from './components/Login_Logout/Logout';
import Education from './components/Education/Education';
import AuthCallback from './components/AuthCallback';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';

import EmploymentPage from "./components/Employment/EmploymentPage";
import EmploymentForm from "./components/Employment/EmploymentForm";

import NewCoverletter from './components/Coverletter/NewCoverletter';
import CoverletterEditor from './components/Coverletter/CoverletterEditor';
import Coverletter from './components/Coverletter/Coverletters';
import ShareView from './components/Coverletter/ShareView';

import PrivateRoute from './components/PrivateRoute';
import Certifications from './components/Certifications/Certifications';
import Projects from "./components/Projects/Projects";

import JobsEntry from './components/Jobs/JobsEntry';
import JobsPipeline from './components/Jobs/JobsPipeline';

import './App.css';

function App() {
  const location = useLocation();
  const hideNavbarRoutes = ["/Login", "/Registration", "/forgot-password", "/reset-password"];
  const showNavbar = !hideNavbarRoutes.includes(location.pathname);

    useEffect(() => {
    // Adjust condition to only clear if leaving *this* page
     if (location.pathname === "/coverletter/editor") {
      // we are currently ON the editor page → don't clear yet
      return;
    }
     console.log("working")
    // leaving the editor → clear
    sessionStorage.removeItem("CoverletterID");
  }, [location.pathname]);
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
          <Route path="/ProfileDashboard" element={<PrivateRoute><ProfileDashboard /></PrivateRoute>} />{/* Protected Routes */}
          <Route path="/ProfilePage" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />{/* Protected Routes */}
          <Route path="/ProfileForm" element={<PrivateRoute><ProfileForm /></PrivateRoute>} />{/* Protected Routes */}
          <Route path="/ProfileForm/:id" element={<PrivateRoute><ProfileForm /></PrivateRoute>} />
          <Route path="/EmploymentPage" element={<PrivateRoute><EmploymentPage/></PrivateRoute>} />
          <Route path="/EmploymentForm" element={<PrivateRoute><EmploymentForm /></PrivateRoute>} />
          <Route path="/EmploymentForm/:id" element={<PrivateRoute><EmploymentForm /></PrivateRoute>} />
          <Route path="/Logout" element={<Logout />} />
          <Route path="/Education" element={<PrivateRoute><Education /></PrivateRoute>} />{/* Protected Routes */}
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/Education" element={<PrivateRoute><Education /></PrivateRoute>} />{/* Protected Routes */}
          <Route path="/Certifications" element={<PrivateRoute><Certifications /></PrivateRoute>} /> {/* Protected Routes */}
          <Route path="/Projects" element={<PrivateRoute><Projects /></PrivateRoute>} />
          <Route path="/Jobs" element={<PrivateRoute><JobsEntry /></PrivateRoute>} />
          <Route path="/Jobs/Pipeline" element={<PrivateRoute><JobsPipeline /></PrivateRoute>} />
          <Route path="/coverletter" element={<PrivateRoute><Coverletter /></PrivateRoute>} />
          <Route path="/newcoverletter" element={<PrivateRoute><NewCoverletter /></PrivateRoute>} />
          <Route path="/coverletter/editor/:id?" element={<PrivateRoute><CoverletterEditor /></PrivateRoute>} />
          <Route path="/coverletter/share/:shareid?" element={<PrivateRoute><ShareView /></PrivateRoute>} />
        </Routes>
      </div>
    </>
  );
}

export default App;