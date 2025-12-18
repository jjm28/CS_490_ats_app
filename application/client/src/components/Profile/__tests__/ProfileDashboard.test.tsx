import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProfileDashboard from '../ProfileDashboard';

// Mock all the API modules
vi.mock('../../../api/profiles', () => ({
  listProfiles: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../../../api/education', () => ({
  getEducation: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../../../api/skills', () => ({
  getSkills: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../../../api/certifications', () => ({
  getCertifications: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../../../api/employment', () => ({
  listEmployment: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../../../api/projects', () => ({
  getProjects: vi.fn(() => Promise.resolve([])),
}));

// Mock fetch for jobs
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([]),
  } as Response)
);

// Mock localStorage
beforeEach(() => {
  const localStorageMock = {
    getItem: vi.fn(() => 'fake-token'),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };
  global.localStorage = localStorageMock as any;
});

describe('ProfileDashboard Component', () => {
  it('renders dashboard heading', async () => {
    render(
      <BrowserRouter>
        <ProfileDashboard />
      </BrowserRouter>
    );
    
    // Check for main heading
    expect(screen.getByText(/Profile Dashboard/i)).toBeInTheDocument();
  });

  it('renders section headings', async () => {
    render(
      <BrowserRouter>
        <ProfileDashboard />
      </BrowserRouter>
    );
    
    // Check for key sections
    expect(screen.getByText(/💼 Employment/i)).toBeInTheDocument();
    expect(screen.getByText(/🎓 Education/i)).toBeInTheDocument();
  });
});