import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../Login';

// Mock the API module
vi.mock('../../../api/user-auth', () => ({
  loginUser: vi.fn(),
}));

describe('Login Component', () => {
  it('renders login form', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );
    
    // Check for key elements
    expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/you@example.com/i)).toBeInTheDocument();
  });

  it('renders social login options', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );
    
    // Check for social login buttons
    const googleButton = screen.getByAltText(/Google/i);
    const microsoftButton = screen.getByAltText(/Microsoft/i);
    const linkedInButton = screen.getByAltText(/LinkedIn/i);
    
    expect(googleButton).toBeInTheDocument();
    expect(microsoftButton).toBeInTheDocument();
    expect(linkedInButton).toBeInTheDocument();
  });
});