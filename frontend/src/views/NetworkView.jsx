import { useEffect, useMemo, useState } from 'react';
import { useNetworkGraph } from '../hooks/useNetwork';
import useNetworkStore from '../store/networkStore';
import NetworkGraph from '../components/network/NetworkGraph';
import NetworkControls from '../components/network/NetworkControls';
import NodeDetails from '../components/network/NodeDetails';
import ExportButton from '../components/common/ExportButton';
import { columnDefs } from '../utils/export';

export default function NetworkView() {
  const { filters, searchQuery, setHighlightedNodes, selectedNode, rotation, setRotation } = useNetworkStore();
  const { data, isLoading, error, refetch } = useNetworkGraph(filters);
  const [controlsMinimized, setControlsMinimized] = useState(false);

  // Keyboard shortcuts for rotation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === '[') {
        e.preventDefault();
        setRotation((rotation - 1 + 360) % 360);
      } else if (e.key === ']') {
        e.preventDefault();
        setRotation((rotation + 1) % 360);
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        setRotation(0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rotation, setRotation]);

  // Handle search highlighting
  useEffect(() => {
    if (!searchQuery || !data?.nodes) {
      setHighlightedNodes([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const matchingNodeIds = data.nodes
      .filter(node => {
        const email = (node.email || '').toLowerCase();
        const name = (node.name || '').toLowerCase();
        return email.includes(query) || name.includes(query);
      })
      .map(node => node.id);

    setHighlightedNodes(matchingNodeIds);
  }, [searchQuery, data, setHighlightedNodes]);

  // Stats from the data
  const stats = useMemo(() => {
    if (!data) return null;
    return {
      nodeCount: data.nodes?.length || 0,
      edgeCount: data.edges?.length || 0,
      ...data.stats
    };
  }, [data]);

  const handleApplyFilters = () => {
    refetch();
  };

  // Prepare network data for export
  const handleNetworkExport = (format) => {
    if (!data || !data.nodes || !data.edges) return null;

    // For CSV, we need to enrich edges with email addresses
    const enrichedEdges = data.edges.map(edge => {
      const sourceNode = data.nodes.find(n => n.id === edge.source);
      const targetNode = data.nodes.find(n => n.id === edge.target);
      return {
        ...edge,
        sourceEmail: sourceNode?.email || '',
        targetEmail: targetNode?.email || '',
      };
    });

    if (format === 'json') {
      return {
        nodes: data.nodes,
        edges: data.edges,
        stats: stats,
        filters: filters,
      };
    }

    // For CSV, return structure that ExportButton can handle
    return {
      nodes: data.nodes,
      edges: enrichedEdges,
    };
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-3xl font-bold text-gray-900">Network Graph</h2>
        <p className="text-gray-600 mt-1">
          Interactive visualization of email communication network
        </p>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-8">
              <div>
                <p className="text-sm text-gray-600">Nodes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.nodeCount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Edges</p>
                <p className="text-2xl font-bold text-gray-900">{stats.edgeCount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Min Emails</p>
                <p className="text-2xl font-bold text-gray-900">{filters.minEmails}</p>
              </div>
            </div>
            <ExportButton
              onExport={handleNetworkExport}
              columns={{
                nodes: columnDefs.networkNodes,
                edges: columnDefs.networkEdges,
              }}
              filename="enron-network"
              disabled={!data || isLoading}
              variant="compact"
              label="Export Graph"
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Controls Sidebar - Collapsible */}
        {!controlsMinimized ? (
          <div className="w-64 flex-shrink-0 overflow-y-auto relative">
            <button
              onClick={() => setControlsMinimized(true)}
              className="absolute top-2 right-2 z-10 p-1 bg-gray-200 hover:bg-gray-300 rounded text-gray-600 hover:text-gray-900 transition-colors"
              title="Minimize controls"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
            <NetworkControls onApplyFilters={handleApplyFilters} />
          </div>
        ) : (
          <div className="flex-shrink-0">
            <button
              onClick={() => setControlsMinimized(false)}
              className="h-full px-2 bg-white rounded-lg shadow hover:bg-gray-50 transition-colors"
              title="Show controls"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        {/* Graph Container */}
        <div className="flex-1 bg-white rounded-lg shadow overflow-hidden relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading network graph...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-red-600 mb-2">Error loading network data</p>
                <p className="text-sm text-gray-600">{error.message}</p>
                <button
                  onClick={() => refetch()}
                  className="mt-4 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {!isLoading && !error && data && (
            <NetworkGraph data={data} />
          )}
        </div>

        {/* Details Sidebar - Only show when node is selected */}
        {selectedNode && (
          <div className="w-80 flex-shrink-0 overflow-y-auto">
            <NodeDetails />
          </div>
        )}
      </div>
    </div>
  );
}
