import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Dashboard } from '../components/Dashboard';

import { statusService } from '../services/status';

vi.mock('../services/status', () => ({
  statusService: {
    read: vi.fn(),
  },
}));

beforeEach(() => {
  vi.mocked(statusService.read).mockResolvedValue({
    versions: [],
    online_workers: [],
    online_api_apps: [],
    online_content_apps: [],
    database_connection: { connected: true },
    redis_connection: { connected: true },
    storage: { total: 0, used: 0, free: 0 },
    content_settings: { content_origin: '', content_path_prefix: '' },
    domain_enabled: true,
  });
});

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

  it('renders status section', async () => {
    renderDashboard();

    expect(await screen.findByText('System Status')).toBeInTheDocument();
  });
});
