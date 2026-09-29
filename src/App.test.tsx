import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
    localStorage.clear();
  });

  it('renders correctly in system language (English default in JSDOM)', async () => {
    render(<App />);
    
    // Check if the Sidebar renders correctly in English
    expect(screen.getByText('Tools')).toBeInTheDocument();
    
    // Check tabs in English
    expect(screen.getAllByText('Quick Clean')[0]).toBeInTheDocument();
    expect(screen.getByText('Uninstaller')).toBeInTheDocument();
    expect(screen.getByText('System Monitor')).toBeInTheDocument();
    
    // Wait for async initialization
    await screen.findByText('Engine v1.0.0');
  });

  it('switches language dynamically to Spanish using the combo selector', async () => {
    render(<App />);
    
    // Language combo should be present
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    
    // Switch to Spanish
    fireEvent.change(select, { target: { value: 'es' } });
    
    // Sidebar should now display Spanish titles
    expect(screen.getByText('Herramientas')).toBeInTheDocument();
    expect(screen.getAllByText('Limpieza Rápida')[0]).toBeInTheDocument();
    expect(screen.getByText('Desinstalador')).toBeInTheDocument();
    expect(screen.getByText('Monitor de Sistema')).toBeInTheDocument();
  });

  it('changes tab when clicking an option', async () => {
    // Force Spanish via localStorage
    localStorage.setItem('kirei_language', 'es');
    render(<App />);
    
    // Click on optimize
    const optimizeBtn = screen.getByText('Optimización');
    fireEvent.click(optimizeBtn);
    
    // Optimize description should be visible
    expect(await screen.findByText('Repara permisos, reconstruye índices y purga memorias caché profundas para mejorar la velocidad de tu Mac.')).toBeInTheDocument();
  });
});
