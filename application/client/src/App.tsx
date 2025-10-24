import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Nav from './components/Nav.tsx';
import HomePage from './components/Homepage.tsx';
import Registration from './components/Registration.tsx';
import Dashboard from './components/Dashboard.tsx';
import LoginPage from './components/Login.tsx';
import ProfilePage from './components/ProfilePage.tsx';
import ProfileForm from './components/ProfileForm.tsx';
import Logout from './components/Logout.tsx';
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  return (
    <div>


      <Nav/>

    <div >    
      <Routes>

        <Route path="/" element={<HomePage />}></Route> 
        <Route path="/Registration" element={<Registration />}></Route> 
        <Route path="/Dashboard" element={<Dashboard />}></Route> 
        <Route path="/Login" element={<LoginPage/>}></Route>
        <Route path="/ProfilePage" element={<ProfilePage/>}></Route>
        <Route path="/ProfileForm" element={<ProfileForm />} ></Route>
        <Route path="/Logout" element={<Logout />} ></Route>
      </Routes>
       </div>


    </div>
  )
}
export default App