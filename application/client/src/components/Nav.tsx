import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Navbar.css';

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLUListElement | null>(null);
  const hamburgerRef = useRef<HTMLDivElement | null>(null);

  const toggleMenu = () => setIsOpen(prev => !prev);
  const closeMenu = () => setIsOpen(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        hamburgerRef.current &&
        !hamburgerRef.current.contains(event.target as Node)
      ) {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <ul className="navbar-menu">
          <li><Link to="/">Home</Link></li>

        </ul>
        <div className="navbar-action">
       
    < Link to="/Registration" onClick={closeMenu} className='navbar-Signup'> Sign UP</Link>
        
        </div>

        <div className="navbar-hamburger" onClick={toggleMenu} ref={hamburgerRef}>
          <span></span>
          <span></span>
          <span></span>
        </div>

    <ul className={`navbar-mobile-menu ${isOpen ? 'active' : ''}`} ref={menuRef}>
        <li><Link to="/" onClick={closeMenu}>Page 1</Link></li>
  <li><Link to="/page2" onClick={closeMenu}>Page 2</Link></li>
  <li><Link to="/page3" onClick={closeMenu}>Page 3</Link></li>
  <li><Link to="/page4" onClick={closeMenu}>Page 4</Link></li>
  <li><Link to="/page5" onClick={closeMenu}>Page 5</Link></li>
  <li> <Link to="/page6" onClick={closeMenu}> Sign UP</Link></li>
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;