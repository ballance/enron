import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/common/Layout';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoadingSpinner from './components/common/LoadingSpinner';

// Lazy load views for code splitting
const Dashboard = React.lazy(() => import('./views/Dashboard'));
const NetworkView = React.lazy(() => import('./views/NetworkView'));
const TimelineView = React.lazy(() => import('./views/TimelineView'));
const ThreadExplorer = React.lazy(() => import('./views/ThreadExplorer'));
const PersonView = React.lazy(() => import('./views/PersonView'));
const SearchResults = React.lazy(() => import('./views/SearchResults'));

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Layout>
          <React.Suspense
            fallback={
              <div className="flex items-center justify-center h-screen">
                <LoadingSpinner size="lg" text="Loading..." />
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/network" element={<NetworkView />} />
              <Route path="/timeline" element={<TimelineView />} />
              <Route path="/threads" element={<ThreadExplorer />} />
              <Route path="/threads/:id" element={<ThreadExplorer />} />
              <Route path="/people/:id" element={<PersonView />} />
              <Route path="/search" element={<SearchResults />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </React.Suspense>
        </Layout>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
