import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Nav from './components/Nav.tsx';
import HomePage from './components/Homepage.tsx';
import Registration from './components/Registration.tsx';
import Dashboard from './components/Dashboard.tsx';
import './App.css'

function App() {
  return (
    <div>


<Nav/>

    <div >    
      <Routes>
    
    <Route path="/" element={<HomePage />}></Route> 
    <Route path="/Registration" element={<Registration />}></Route> 
    <Route path="/Dashboard" element={<Dashboard />}></Route> 
      </Routes>
       </div>

      
    </div>
  )
}

export default App
