import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockImplementation(async (cmd) => {
    if (cmd === 'get_active_mole_path_cmd') {
      return '/some/path/mole';
    }
    if (cmd === 'get_current_version') {
      return '1.0.0';
    }
    if (cmd === 'check_for_updates') {
      return { update_available: false, latest_version: '1.0.0' };
    }
    return null;
  })
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn().mockImplementation(async () => {
    return vi.fn(); // return unlisten function
  })
}));

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly and shows tools title', async () => {
    render(<App />);
    
    // Check if the Sidebar renders correctly
    expect(screen.getByText('Herramientas')).toBeInTheDocument();
    
    // Check if the tabs are present
    expect(screen.getAllByText('Limpieza Rápida')[0]).toBeInTheDocument();
    expect(screen.getByText('Desinstalador')).toBeInTheDocument();
    expect(screen.getByText('Monitor de Sistema')).toBeInTheDocument();
    
    // Wait for async initialization
    await screen.findByText('Motor v1.0.0');
  });

  it('changes tab when clicking a button', async () => {
    render(<App />);
    
    // Click on optimize
    const optimizeBtn = screen.getByText('Optimización');
    optimizeBtn.click();
    
    // Optimize title should be visible
    expect(await screen.findByText('Repara permisos, reconstruye índices y purga memorias caché profundas para mejorar la velocidad de tu Mac.')).toBeInTheDocument();
  });
});
