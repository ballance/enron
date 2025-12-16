import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NetworkControls from '../NetworkControls';
import useNetworkStore from '../../../store/networkStore';

vi.mock('../../../store/networkStore');

describe('NetworkControls', () => {
  const mockSetFilters = vi.fn();
  const mockSetLayoutSettings = vi.fn();
  const mockSetSearchQuery = vi.fn();
  const mockReset = vi.fn();
  const mockOnApplyFilters = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    useNetworkStore.mockReturnValue({
      filters: { minEmails: 5, limit: 500 },
      setFilters: mockSetFilters,
      layoutSettings: {
        type: 'force-directed',
        nodeSize: 'activity',
        nodeColor: 'activity',
        showLabels: true,
        showEdgeLabels: false,
      },
      setLayoutSettings: mockSetLayoutSettings,
      searchQuery: '',
      setSearchQuery: mockSetSearchQuery,
      reset: mockReset,
    });
  });

  it('should render all control sections', () => {
    render(<NetworkControls />);

    expect(screen.getByText('Network Controls')).toBeInTheDocument();
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Layout Settings')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  it('should display current filter values', () => {
    render(<NetworkControls />);

    expect(screen.getByText(/Minimum Emails: 5/)).toBeInTheDocument();
    expect(screen.getByText(/Node Limit: 500/)).toBeInTheDocument();
  });

  it('should call onApplyFilters when Apply button is clicked', () => {
    render(<NetworkControls onApplyFilters={mockOnApplyFilters} />);

    const applyButton = screen.getByText('Apply Filters');
    fireEvent.click(applyButton);

    expect(mockSetFilters).toHaveBeenCalledWith({ minEmails: 5, limit: 500 });
    expect(mockOnApplyFilters).toHaveBeenCalledWith({ minEmails: 5, limit: 500 });
  });

  it('should update layout settings when changed', () => {
    render(<NetworkControls />);

    const layoutSelect = screen.getByLabelText('Layout Type');
    fireEvent.change(layoutSelect, { target: { value: 'circular' } });

    expect(mockSetLayoutSettings).toHaveBeenCalledWith({ type: 'circular' });
  });

  it('should update search query when typing', () => {
    render(<NetworkControls />);

    const searchInput = screen.getByPlaceholderText('Search by name or email...');
    fireEvent.change(searchInput, { target: { value: 'john' } });

    expect(mockSetSearchQuery).toHaveBeenCalledWith('john');
  });

  it('should reset all settings when Reset button is clicked', () => {
    render(<NetworkControls onApplyFilters={mockOnApplyFilters} />);

    const resetButton = screen.getByText('Reset All Settings');
    fireEvent.click(resetButton);

    expect(mockReset).toHaveBeenCalled();
    expect(mockOnApplyFilters).toHaveBeenCalledWith({ minEmails: 5, limit: 500 });
  });

  it('should toggle checkbox settings', () => {
    render(<NetworkControls />);

    const showLabelsCheckbox = screen.getByLabelText('Show Labels');
    fireEvent.click(showLabelsCheckbox);

    expect(mockSetLayoutSettings).toHaveBeenCalledWith({ showLabels: false });
  });
});
