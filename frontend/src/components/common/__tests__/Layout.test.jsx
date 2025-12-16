import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Layout from '../Layout';

describe('Layout Component', () => {
  const renderLayout = (children = <div>Test Content</div>) => {
    return render(
      <BrowserRouter>
        <Layout>{children}</Layout>
      </BrowserRouter>
    );
  };

  it('should render the main title', () => {
    renderLayout();
    expect(screen.getByText('Enron Email Visualization')).toBeInTheDocument();
  });

  it('should render navigation links', () => {
    renderLayout();

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Network')).toBeInTheDocument();
    expect(screen.getByText('Timeline')).toBeInTheDocument();
    expect(screen.getByText('Threads')).toBeInTheDocument();
  });

  it('should render children content', () => {
    renderLayout(<div>Custom Test Content</div>);
    expect(screen.getByText('Custom Test Content')).toBeInTheDocument();
  });

  it('should render footer with dataset stats', () => {
    renderLayout();
    expect(screen.getByText(/517K messages/i)).toBeInTheDocument();
    expect(screen.getByText(/87K people/i)).toBeInTheDocument();
    expect(screen.getByText(/127K threads/i)).toBeInTheDocument();
  });

  it('should have correct navigation links', () => {
    renderLayout();

    const dashboardLink = screen.getByText('Dashboard').closest('a');
    const networkLink = screen.getByText('Network').closest('a');
    const timelineLink = screen.getByText('Timeline').closest('a');
    const threadsLink = screen.getByText('Threads').closest('a');

    expect(dashboardLink).toHaveAttribute('href', '/');
    expect(networkLink).toHaveAttribute('href', '/network');
    expect(timelineLink).toHaveAttribute('href', '/timeline');
    expect(threadsLink).toHaveAttribute('href', '/threads');
  });
});
