import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import NodeDetails from '../NodeDetails';
import useNetworkStore from '../../../store/networkStore';

vi.mock('../../../store/networkStore');

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('NodeDetails', () => {
  const mockSetSelectedNode = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show placeholder when no node is selected', () => {
    useNetworkStore.mockReturnValue({
      selectedNode: null,
      setSelectedNode: mockSetSelectedNode,
    });

    renderWithRouter(<NodeDetails />);

    expect(screen.getByText('Click a node to view details')).toBeInTheDocument();
  });

  it('should display node details when a node is selected', () => {
    const mockNode = {
      id: 1,
      email: 'john.doe@enron.com',
      name: 'John Doe',
      sentCount: 150,
      receivedCount: 100,
      totalActivity: 250,
    };

    useNetworkStore.mockReturnValue({
      selectedNode: mockNode,
      setSelectedNode: mockSetSelectedNode,
    });

    renderWithRouter(<NodeDetails />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john.doe@enron.com')).toBeInTheDocument();
    expect(screen.getByText('250')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('should display center node badge when isCenter is true', () => {
    const mockNode = {
      id: 1,
      email: 'john.doe@enron.com',
      sentCount: 150,
      receivedCount: 100,
      isCenter: true,
    };

    useNetworkStore.mockReturnValue({
      selectedNode: mockNode,
      setSelectedNode: mockSetSelectedNode,
    });

    renderWithRouter(<NodeDetails />);

    expect(screen.getByText('Center Node')).toBeInTheDocument();
  });

  it('should calculate sent/received ratio correctly', () => {
    const mockNode = {
      id: 1,
      email: 'john.doe@enron.com',
      sentCount: 200,
      receivedCount: 100,
    };

    useNetworkStore.mockReturnValue({
      selectedNode: mockNode,
      setSelectedNode: mockSetSelectedNode,
    });

    renderWithRouter(<NodeDetails />);

    expect(screen.getByText('2.00')).toBeInTheDocument();
  });

  it('should close details when close button is clicked', () => {
    const mockNode = {
      id: 1,
      email: 'john.doe@enron.com',
      sentCount: 100,
      receivedCount: 50,
    };

    useNetworkStore.mockReturnValue({
      selectedNode: mockNode,
      setSelectedNode: mockSetSelectedNode,
    });

    renderWithRouter(<NodeDetails />);

    const closeButton = screen.getByLabelText('Close details');
    fireEvent.click(closeButton);

    expect(mockSetSelectedNode).toHaveBeenCalledWith(null);
  });

  it('should render link to person details page', () => {
    const mockNode = {
      id: 1,
      email: 'john.doe@enron.com',
      sentCount: 100,
      receivedCount: 50,
    };

    useNetworkStore.mockReturnValue({
      selectedNode: mockNode,
      setSelectedNode: mockSetSelectedNode,
    });

    renderWithRouter(<NodeDetails />);

    const link = screen.getByText('View Person Details');
    expect(link).toHaveAttribute('href', '/people/1');
  });

  it('should handle missing name by using email prefix', () => {
    const mockNode = {
      id: 1,
      email: 'john.doe@enron.com',
      sentCount: 100,
      receivedCount: 50,
    };

    useNetworkStore.mockReturnValue({
      selectedNode: mockNode,
      setSelectedNode: mockSetSelectedNode,
    });

    renderWithRouter(<NodeDetails />);

    expect(screen.getByText('john.doe')).toBeInTheDocument();
  });
});
