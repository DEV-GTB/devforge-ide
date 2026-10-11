// Architecture Panel UI Component
import React, { useState, useEffect } from 'react';
import { GraphBuilder, GraphNode, GraphEdge } from './GraphBuilder';

export function ArchitecturePanel({ projectId }: { projectId: string }) {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  useEffect(() => {
    loadArchitecture();
  }, [projectId]);

  const loadArchitecture = async () => {
    const builder = new GraphBuilder();

    // Mock data - in real implementation, load from project intelligence
    const mockNodes: GraphNode[] = [
      { id: 'App.tsx', name: 'App.tsx', type: 'component', path: 'src/App.tsx' },
      { id: 'auth.ts', name: 'auth.ts', type: 'file', path: 'src/services/auth.ts' },
      { id: 'api/login', name: '/api/login', type: 'api', path: 'api/login' },
      { id: 'users', name: 'users', type: 'database', path: 'database/users' },
    ];

    const mockEdges: GraphEdge[] = [
      { source: 'App.tsx', target: 'auth.ts', type: 'IMPORT' },
      { source: 'auth.ts', target: 'api/login', type: 'API_CALL' },
      { source: 'api/login', target: 'users', type: 'DATABASE_ACCESS' },
    ];

    mockNodes.forEach(n => builder.addNode(n));
    mockEdges.forEach(e => builder.addEdge(e));

    setNodes(builder.getNodes());
    setEdges(builder.getEdges());
  };

  const getNodeTypeColor = (type: GraphNode['type']) => {
    const colors: Record<GraphNode['type'], string> = {
      file: 'bg-blue-500',
      function: 'bg-green-500',
      class: 'bg-purple-500',
      component: 'bg-yellow-500',
      api: 'bg-orange-500',
      database: 'bg-red-500',
    };
    return colors[type];
  };

  const getEdgeTypeColor = (type: GraphEdge['type']) => {
    const colors: Record<GraphEdge['type'], string> = {
      IMPORT: 'stroke-blue-400',
      CALLS: 'stroke-green-400',
      EXTENDS: 'stroke-purple-400',
      IMPLEMENTS: 'stroke-pink-400',
      USES: 'stroke-gray-400',
      API_CALL: 'stroke-orange-400',
      DATABASE_ACCESS: 'stroke-red-400',
    };
    return colors[type];
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold">Architecture Map</h2>
      </div>

      {/* Graph View */}
      <div className="flex-1 p-4 overflow-auto">
        <svg className="w-full h-full" viewBox="0 0 800 600">
          {/* Edges */}
          {edges.map((edge, i) => {
            const source = nodes.find(n => n.id === edge.source);
            const target = nodes.find(n => n.id === edge.target);
            if (!source || !target) return null;

            // Simple layout - in real implementation, use a graph layout library
            const sourceX = 200 + (nodes.indexOf(source) % 3) * 200;
            const sourceY = 100 + Math.floor(nodes.indexOf(source) / 3) * 150;
            const targetX = 200 + (nodes.indexOf(target) % 3) * 200;
            const targetY = 100 + Math.floor(nodes.indexOf(target) / 3) * 150;

            return (
              <g key={i}>
                <line
                  x1={sourceX}
                  y1={sourceY}
                  x2={targetX}
                  y2={targetY}
                  className={getEdgeTypeColor(edge.type)}
                  strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
                <text
                  x={(sourceX + targetX) / 2}
                  y={(sourceY + targetY) / 2 - 5}
                  className="fill-gray-400 text-xs"
                >
                  {edge.type}
                </text>
              </g>
            );
          })}

          {/* Arrow marker */}
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#9CA3AF" />
            </marker>
          </defs>

          {/* Nodes */}
          {nodes.map((node, i) => {
            const x = 200 + (i % 3) * 200;
            const y = 100 + Math.floor(i / 3) * 150;

            return (
              <g
                key={node.id}
                onClick={() => setSelectedNode(node)}
                className="cursor-pointer"
              >
                <rect
                  x={x - 60}
                  y={y - 20}
                  width={120}
                  height={40}
                  rx={8}
                  className={selectedNode?.id === node.id ? 'stroke-blue-400 stroke-2' : ''}
                  fill="#1F2937"
                />
                <circle cx={x - 50} cy={y} r={6} className={getNodeTypeColor(node.type)} />
                <text x={x - 35} y={y + 4} className="fill-white text-sm">
                  {node.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Node Details */}
      {selectedNode && (
        <div className="border-t border-gray-700 p-4">
          <div className="text-sm font-medium mb-2">{selectedNode.name}</div>
          <div className="text-xs text-gray-400 space-y-1">
            <div>Type: {selectedNode.type}</div>
            <div>Path: {selectedNode.path}</div>
            {selectedNode.line && <div>Line: {selectedNode.line}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
