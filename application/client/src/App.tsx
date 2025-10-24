import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Nav from './components/Nav';
import HomePage from './components/Homepage';
import Registration from './components/Registration';
import Dashboard from './components/Dashboard';
import Skills from './components/Skills/Skills';
import LoginPage from './components/Login';
import ProfilePage from './components/ProfilePage';
import ProfileForm from './components/ProfileForm';
import Logout from './components/Logout';
import './App.css';

function App() {
  return (
    <Router>
      <Nav />
      <div className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/Registration" element={<Registration />} />
          <Route path="/Dashboard" element={<Dashboard />} />
          <Route path="/Skills" element={<Skills />} />
          <Route path="/Login" element={<LoginPage />} />
          <Route path="/ProfilePage" element={<ProfilePage />} />
          <Route path="/ProfileForm" element={<ProfileForm />} />
          <Route path="/Logout" element={<Logout />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;