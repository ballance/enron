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

  // Check if thread is too large
  const isThreadTooLarge = data?.error === 'THREAD_TOO_LARGE';

  // Transform the tree data to react-d3-tree format
  const treeData = useMemo(() => {
    if (isThreadTooLarge || !data?.tree || data.tree.length === 0) return null;

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
  }, [data, isThreadTooLarge]);

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

  if (isThreadTooLarge) {
    return (
      <div className="p-8 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start gap-4">
          <svg className="w-12 h-12 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h3 className="text-lg font-semibold text-yellow-900 mb-2">Thread Too Large for Tree View</h3>
            <p className="text-yellow-800 mb-4">{data.message}</p>
            <div className="bg-white rounded-md p-4 mb-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total Messages:</span>
                  <span className="ml-2 font-semibold text-gray-900">{data.totalMessages?.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-600">Tree View Limit:</span>
                  <span className="ml-2 font-semibold text-gray-900">{data.limit?.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Try the "Messages" tab to view paginated emails
              </span>
            </div>
          </div>
        </div>
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
