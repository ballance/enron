import { useRef, useCallback, useEffect } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import useNetworkStore from '../../store/networkStore';

const NetworkGraph = ({ data }) => {
  const graphRef = useRef();

  const {
    selectedNode,
    setSelectedNode,
    layoutSettings,
    searchQuery,
    highlightedNodes,
    setZoomLevel,
  } = useNetworkStore();

  const { nodes = [], edges = [] } = data || {};

  // Calculate node size based on settings
  const getNodeSize = useCallback((node) => {
    const { nodeSize } = layoutSettings;
    const baseSize = 4;

    if (nodeSize === 'uniform') return baseSize;

    const activity = node.totalActivity || (node.sentCount + node.receivedCount);
    const maxActivity = Math.max(...nodes.map(n => n.totalActivity || (n.sentCount + n.receivedCount)));

    if (nodeSize === 'activity') {
      return baseSize + (activity / maxActivity) * 8;
    }

    if (nodeSize === 'sent') {
      const maxSent = Math.max(...nodes.map(n => n.sentCount));
      return baseSize + (node.sentCount / maxSent) * 8;
    }

    if (nodeSize === 'received') {
      const maxReceived = Math.max(...nodes.map(n => n.receivedCount));
      return baseSize + (node.receivedCount / maxReceived) * 8;
    }

    return baseSize;
  }, [layoutSettings, nodes]);

  // Calculate node color based on settings
  const getNodeColor = useCallback((node) => {
    const { nodeColor } = layoutSettings;

    if (selectedNode && node.id === selectedNode.id) {
      return '#ef4444'; // red for selected
    }

    if (highlightedNodes.has(node.id)) {
      return '#f59e0b'; // amber for highlighted
    }

    if (nodeColor === 'uniform') {
      return '#3b82f6'; // blue
    }

    if (nodeColor === 'activity') {
      const activity = node.totalActivity || (node.sentCount + node.receivedCount);
      const maxActivity = Math.max(...nodes.map(n => n.totalActivity || (n.sentCount + n.receivedCount)));
      const ratio = activity / maxActivity;

      // Color gradient from light blue to dark blue
      const lightness = 70 - (ratio * 40);
      return `hsl(215, 90%, ${lightness}%)`;
    }

    if (node.isCenter) {
      return '#10b981'; // green for center node in ego network
    }

    return '#3b82f6';
  }, [layoutSettings, selectedNode, highlightedNodes, nodes]);

  // Node click handler
  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);

    // Center camera on clicked node
    if (graphRef.current) {
      const distance = 200;
      const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
      graphRef.current.cameraPosition(
        { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
        node,
        1000
      );
    }
  }, [setSelectedNode]);

  // Apply layout settings
  useEffect(() => {
    if (!graphRef.current) return;

    const graph = graphRef.current;

    // Configure forces based on layout type
    if (layoutSettings.type === 'force-directed') {
      graph.d3Force('charge').strength(-30);
      graph.d3Force('link').distance(30);
    } else if (layoutSettings.type === 'circular') {
      graph.d3Force('charge').strength(-10);
      graph.d3Force('link').distance(50);
    }

    graph.d3ReheatSimulation();
  }, [layoutSettings.type]);

  if (!data || nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">No data available</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <ForceGraph3D
        ref={graphRef}
        graphData={{ nodes, links: edges }}
        nodeId="id"
        nodeVal={getNodeSize}
        nodeColor={getNodeColor}
        nodeLabel={(node) => {
          const name = node.name || node.email?.split('@')[0] || '';
          const activity = node.totalActivity || (node.sentCount + node.receivedCount);
          return `${name}\nEmails: ${activity.toLocaleString()}`;
        }}
        nodeRelSize={4}
        onNodeClick={handleNodeClick}
        linkColor={() => 'rgba(107, 114, 128, 0.7)'}
        linkWidth={(link) => {
          const maxValue = Math.max(...edges.map(e => e.value || 1));
          return 1 + (link.value / maxValue) * 6;
        }}
        linkDirectionalParticles={4}
        linkDirectionalParticleWidth={(link) => {
          const maxValue = Math.max(...edges.map(e => e.value || 1));
          return 1 + (link.value / maxValue) * 4;
        }}
        linkDirectionalParticleSpeed={0.006}
        backgroundColor="#f9fafb"
        enableNodeDrag={true}
        enableNavigationControls={true}
        showNavInfo={false}
        controlType="orbit"
      />
    </div>
  );
};

export default NetworkGraph;
