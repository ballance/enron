import { useMemo } from 'react';
import Tree from 'react-d3-tree';
import { useThreadTree } from '../../hooks/useThreads';

const ThreadTree = ({ threadId }) => {
  const { data, isLoading, error } = useThreadTree(threadId);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Transform the tree data to react-d3-tree format
  const treeData = useMemo(() => {
    if (!data?.tree || data.tree.length === 0) return null;

    const transformNode = (node) => ({
      name: node.sender_name || node.sender_email?.split('@')[0] || 'Unknown',
      attributes: {
        email: node.sender_email || '',
        date: formatDate(node.date),
        subject: node.subject ? node.subject.substring(0, 50) : ''
      },
      children: node.children?.map(transformNode) || []
    });

    // If there are multiple root messages, create a virtual root
    if (data.tree.length > 1) {
      return {
        name: 'Thread Root',
        attributes: {},
        children: data.tree.map(transformNode)
      };
    }

    return transformNode(data.tree[0]);
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-md">
        Error loading thread tree: {error.message}
      </div>
    );
  }

  if (!treeData) {
    return (
      <div className="p-4 text-center text-gray-500">
        No thread structure available
      </div>
    );
  }

  // Custom node rendering
  const renderCustomNode = ({ nodeDatum }) => {
    const isVirtualRoot = nodeDatum.name === 'Thread Root';

    return (
      <g>
        <circle r={isVirtualRoot ? 8 : 20} fill={isVirtualRoot ? '#94a3b8' : '#3b82f6'} />
        {!isVirtualRoot && (
          <>
            <text
              fill="#1f2937"
              strokeWidth="0"
              x="30"
              y="-10"
              fontSize="14"
              fontWeight="bold"
            >
              {nodeDatum.name}
            </text>
            {nodeDatum.attributes?.email && (
              <text
                fill="#6b7280"
                strokeWidth="0"
                x="30"
                y="5"
                fontSize="11"
              >
                {nodeDatum.attributes.email}
              </text>
            )}
            {nodeDatum.attributes?.date && (
              <text
                fill="#9ca3af"
                strokeWidth="0"
                x="30"
                y="20"
                fontSize="10"
              >
                {nodeDatum.attributes.date}
              </text>
            )}
            {nodeDatum.attributes?.subject && (
              <text
                fill="#9ca3af"
                strokeWidth="0"
                x="30"
                y="33"
                fontSize="9"
                fontStyle="italic"
              >
                {nodeDatum.attributes.subject}
              </text>
            )}
          </>
        )}
      </g>
    );
  };

  return (
    <div className="w-full h-full bg-gray-50 rounded-lg border">
      <div className="h-full" style={{ minHeight: '600px' }}>
        <Tree
          data={treeData}
          orientation="vertical"
          pathFunc="step"
          translate={{ x: 400, y: 100 }}
          nodeSize={{ x: 300, y: 150 }}
          separation={{ siblings: 1.5, nonSiblings: 2 }}
          renderCustomNodeElement={renderCustomNode}
          zoomable={true}
          collapsible={true}
          initialDepth={2}
          enableLegacyTransitions={true}
        />
      </div>
      <div className="p-3 bg-white border-t text-xs text-gray-600">
        <p>💡 <strong>Tip:</strong> Click nodes to expand/collapse branches. Drag to pan. Scroll to zoom.</p>
      </div>
    </div>
  );
};

export default ThreadTree;
