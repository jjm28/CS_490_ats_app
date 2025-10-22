import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Nav from './components/Nav.tsx';
import HomePage from './components/Homepage.tsx';
import Registration from './components/Registration.tsx';
import Dashboard from './components/Dashboard.tsx';
import ForgotPassword from './components/ForgotPassword.tsx'
import ResetPassword from './components/ResetPassword.tsx'
import Login from './components/Login.tsx'
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
    <Route path="/login" element={<Login />}></Route>
    <Route path="/forgot-password" element={<ForgotPassword />} ></Route>
    <Route path="/reset-password/:token" element={<ResetPassword/>} ></Route>
      </Routes>
       </div>

      
    </div>
  )
}

export default App
