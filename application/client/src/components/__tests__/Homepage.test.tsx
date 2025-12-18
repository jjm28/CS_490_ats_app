import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Homepage from '../Homepage';

describe('HomePage Component', () => {
  it('renders without crashing', () => {
    render(
      <BrowserRouter>
        <Homepage />
      </BrowserRouter>
    );
    
    // Just check that it renders
    expect(screen.getByText(/Job Search Journey/i)).toBeInTheDocument();
  });

  it('renders call-to-action buttons', () => {
    render(
      <BrowserRouter>
        <Homepage />
      </BrowserRouter>
    );
    
    // Check for CTA buttons using getAllBy since there are multiple
    const getStartedButtons = screen.getAllByText(/Get Started Free/i);
    expect(getStartedButtons.length).toBeGreaterThan(0);
  });

  it('renders stats section', () => {
    render(
      <BrowserRouter>
        <Homepage />
      </BrowserRouter>
    );
    
    // Check for stats
    expect(screen.getByText(/10x/i)).toBeInTheDocument();
    expect(screen.getByText(/Faster Application Process/i)).toBeInTheDocument();
  });

  it('renders main sections', () => {
    render(
      <BrowserRouter>
        <Homepage />
      </BrowserRouter>
    );
    
    // Check that key sections exist
    expect(screen.getByText(/Everything You Need to Succeed/i)).toBeInTheDocument();
    expect(screen.getByText(/Your Job Search, Simplified/i)).toBeInTheDocument();
  });
});