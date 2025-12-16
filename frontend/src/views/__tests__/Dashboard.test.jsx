import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Dashboard from '../Dashboard';

describe('Dashboard View', () => {
  it('should render dashboard title', () => {
    render(<Dashboard />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('should render placeholder content', () => {
    render(<Dashboard />);
    expect(screen.getByText(/Dashboard view - Coming in Phase 2/i)).toBeInTheDocument();
  });

  it('should have proper structure', () => {
    const { container } = render(<Dashboard />);

    // Check for white card container
    const card = container.querySelector('.bg-white');
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('rounded-lg', 'shadow', 'p-6');
  });
});
