import { create } from 'zustand';

const useNetworkStore = create((set) => ({
  // Selected node
  selectedNode: null,
  setSelectedNode: (node) => set({ selectedNode: node }),

  // Filters
  filters: {
    minEmails: 5,
    limit: 500,
  },
  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters }
  })),

  // Graph layout settings
  layoutSettings: {
    type: 'force-directed', // 'force-directed', 'circular', 'hierarchical'
    nodeSize: 'activity', // 'uniform', 'activity', 'sent', 'received'
    nodeColor: 'activity', // 'uniform', 'activity', 'type'
    showLabels: true,
    showEdgeLabels: false,
  },
  setLayoutSettings: (settings) => set((state) => ({
    layoutSettings: { ...state.layoutSettings, ...settings }
  })),

  // Search/highlight
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  highlightedNodes: new Set(),
  setHighlightedNodes: (nodeIds) => set({ highlightedNodes: new Set(nodeIds) }),

  // Graph interaction state
  zoomLevel: 1,
  setZoomLevel: (zoom) => set({ zoomLevel: zoom }),

  // Rotation state (in degrees)
  rotation: 0,
  setRotation: (rotation) => set({ rotation }),

  // Reset all state
  reset: () => set({
    selectedNode: null,
    filters: { minEmails: 5, limit: 500 },
    layoutSettings: {
      type: 'force-directed',
      nodeSize: 'activity',
      nodeColor: 'activity',
      showLabels: true,
      showEdgeLabels: false,
    },
    searchQuery: '',
    highlightedNodes: new Set(),
    zoomLevel: 1,
    rotation: 0,
  }),
}));

export default useNetworkStore;
