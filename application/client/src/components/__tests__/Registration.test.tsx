import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Registration from '../Registration';

// Mock the API module
vi.mock('../../api/user-auth', () => ({
  createUser: vi.fn(),
}));

describe('Registration Component', () => {
  it('renders registration form', () => {
    render(
      <BrowserRouter>
        <Registration />
      </BrowserRouter>
    );
    
    // Check for key elements
    expect(screen.getByText(/Create your account/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/you@example.com/i)).toBeInTheDocument();
  });

  it('renders all required form fields', () => {
    render(
      <BrowserRouter>
        <Registration />
      </BrowserRouter>
    );
    
    // Check for form inputs by placeholder or name
    expect(screen.getByPlaceholderText(/you@example.com/i)).toBeInTheDocument();
    expect(screen.getByText(/Email address/i)).toBeInTheDocument();
    expect(screen.getByText(/First Name/i)).toBeInTheDocument();
    expect(screen.getByText(/Last Name/i)).toBeInTheDocument();
  });

  it('renders social registration options', () => {
    render(
      <BrowserRouter>
        <Registration />
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

  it('renders link to login page', () => {
    render(
      <BrowserRouter>
        <Registration />
      </BrowserRouter>
    );
    
    const loginLink = screen.getByText(/Log in/i);
    expect(loginLink).toBeInTheDocument();
  });
});