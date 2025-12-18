import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';

// Mock Sentry
vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  ErrorBoundary: ({ children }: any) => children,
  browserTracingIntegration: vi.fn(() => ({})),
  reactRouterV6BrowserTracingIntegration: vi.fn(() => ({})),
  replayIntegration: vi.fn(() => ({})),
}));

describe('App Component', () => {
  it('renders without crashing', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );
    
    // App should render the main content div
    const mainContent = document.querySelector('.main-content');
    expect(mainContent).toBeInTheDocument();
  });
});