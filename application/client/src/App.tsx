import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

import { Routes, Route, NavLink } from 'react-router-dom' 
import ProfilePage from './pages/ProfilePage'

function Home() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

function App() { 
  const link = 'px-3 py-2 rounded hover:bg-gray-100' 
  const active = 'bg-gray-200' 

  return (
    <div className="min-h-screen"> 
      {/* Simple header with navigation links. Should be added to or changed later */}
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <NavLink to="/" className="font-semibold">
            ATS for Candidates
          </NavLink>
          <nav className="flex gap-2">
            <NavLink
              to="/"
              end
              className={({ isActive }) => `${link} ${isActive ? active : ''}`}
            >
              Home
            </NavLink>
            <NavLink
              to="/profile"
              className={({ isActive }) => `${link} ${isActive ? active : ''}`}
            >
              Profile
            </NavLink>
          </nav>
        </div>
      </header>

      {/* Route setup */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} /> {/* renders your demo page */}
          <Route path="/profile" element={<ProfilePage />} /> {/*  routes to ProfilePage */}
        </Routes>
      </main>
    </div>
  )
}

export default App
