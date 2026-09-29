import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import { invoke } from '@tauri-apps/api/core';

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
    if (cmd === 'download_and_install_mole') {
      return null;
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
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('navigates to Settings and switches language to Spanish and back to English', async () => {
    render(<App />);
    
    // Click on Settings tab in sidebar
    const settingsTab = screen.getByText('Settings');
    fireEvent.click(settingsTab);
    
    // In Settings, verify the Language and Engine sections appear
    expect(await screen.findByText('Interface Language')).toBeInTheDocument();
    expect(screen.getByText('Cleaning Engine (Mole)')).toBeInTheDocument();
    
    // Switch to Spanish
    const esBtn = screen.getByText('Español');
    fireEvent.click(esBtn);
    
    // UI should dynamically update to Spanish and update localStorage
    await waitFor(() => {
      expect(screen.getByText('Herramientas')).toBeInTheDocument();
      expect(screen.getAllByText('Configuración')[0]).toBeInTheDocument();
      expect(screen.getByText('Idioma de la Interfaz')).toBeInTheDocument();
      expect(localStorage.getItem('kirei_language')).toBe('es');
    });

    // Switch back to English
    const enBtn = screen.getByText('English');
    fireEvent.click(enBtn);

    await waitFor(() => {
      expect(screen.getByText('Tools')).toBeInTheDocument();
      expect(screen.getAllByText('Settings')[0]).toBeInTheDocument();
      expect(screen.getByText('Interface Language')).toBeInTheDocument();
      expect(localStorage.getItem('kirei_language')).toBe('en');
    });
  });

  it('switches themes correctly from Settings', async () => {
    const { container } = render(<App />);
    
    // Open Settings
    fireEvent.click(screen.getByText('Settings'));
    
    // Click Light Theme
    const lightBtn = await screen.findByText('Light');
    fireEvent.click(lightBtn);
    expect(container.querySelector('.theme-light')).toBeInTheDocument();
    
    // Click Dark Theme
    const darkBtn = screen.getByText('Dark');
    fireEvent.click(darkBtn);
    expect(container.querySelector('.theme-dark')).toBeInTheDocument();

    // Click Default Theme
    const defaultBtn = screen.getByText('Default');
    fireEvent.click(defaultBtn);
    expect(container.querySelector('.theme-default')).toBeInTheDocument();
  });

  it('checks for engine updates from Settings', async () => {
    render(<App />);
    
    // Open Settings
    fireEvent.click(screen.getByText('Settings'));
    
    // Click Check for Updates button
    const checkBtn = await screen.findByText('Check for Updates');
    fireEvent.click(checkBtn);
    
    // Verify invoke was called for check_for_updates
    expect(invoke).toHaveBeenCalledWith('check_for_updates');
    
    // Verify feedback message appears
    expect(await screen.findByText(/Engine up to date/i)).toBeInTheDocument();
  });

  it('triggers engine reinstallation from Settings', async () => {
    render(<App />);
    
    // Open Settings
    fireEvent.click(screen.getByText('Settings'));
    
    // Click Reinstall Engine button
    const reinstallBtn = await screen.findByText('Reinstall Engine');
    fireEvent.click(reinstallBtn);
    
    // Verify invoke was called for download_and_install_mole
    expect(invoke).toHaveBeenCalledWith('download_and_install_mole');
  });

  it('changes tab and displays module content', async () => {
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
