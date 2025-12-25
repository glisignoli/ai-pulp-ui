import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Dashboard } from '../components/Dashboard';

const renderDashboard = () => {
  return render(
    <BrowserRouter>
      <Dashboard />
    </BrowserRouter>
  );
};

describe('Dashboard Component', () => {
  it('renders dashboard with title', () => {
    renderDashboard();
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders all content type cards', () => {
    renderDashboard();
    
    expect(screen.getByText('RPM')).toBeInTheDocument();
    expect(screen.getByText('File')).toBeInTheDocument();
    expect(screen.getByText('DEB')).toBeInTheDocument();
  });

  it('renders welcome message', () => {
    renderDashboard();
    
    expect(screen.getByText('Welcome to Pulp UI')).toBeInTheDocument();
    expect(screen.getByText(/Pulp is a platform for managing repositories/i)).toBeInTheDocument();
  });
});
