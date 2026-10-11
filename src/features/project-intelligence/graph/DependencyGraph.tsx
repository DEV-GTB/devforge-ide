import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ZoomIn, ZoomOut, Maximize2, Download, Layers } from 'lucide-react';

export interface GraphNode {
  id: string;
  label: string;
  type: 'file' | 'component' | 'function' | 'variable' | 'import';
  x: number;
  y: number;
  metadata?: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'imports' | 'exports' | 'depends' | 'calls';
  weight: number;
}

interface DependencyGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick?: (node: GraphNode) => void;
  onEdgeClick?: (edge: GraphEdge) => void;
}

export function DependencyGraph({ nodes, edges, onNodeClick, onEdgeClick }: DependencyGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.parentElement?.clientWidth || 800;
    canvas.height = canvas.parentElement?.clientHeight || 600;

    drawGraph(ctx, canvas.width, canvas.height);
  }, [nodes, edges, scale, offset]);

  const drawGraph = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    // Draw edges
    edges.forEach(edge => {
      const source = nodes.find(n => n.id === edge.source);
      const target = nodes.find(n => n.id === edge.target);

      if (source && target) {
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.strokeStyle = getEdgeColor(edge.type);
        ctx.lineWidth = edge.weight;
        ctx.stroke();
      }
    });

    // Draw nodes
    nodes.forEach(node => {
      ctx.beginPath();
      ctx.arc(node.x, node.y, 20, 0, Math.PI * 2);
      ctx.fillStyle = getNodeColor(node.type);
      ctx.fill();
      ctx.strokeStyle = '#4B5563';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw label
      ctx.fillStyle = '#fff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(node.label, node.x, node.y + 35);
    });

    ctx.restore();
  };

  const getNodeColor = (type: GraphNode['type']): string => {
    const colors = {
      file: '#3B82F6',
      component: '#8B5CF6',
      function: '#10B981',
      variable: '#F59E0B',
      import: '#EF4444',
    };
    return colors[type];
  };

  const getEdgeColor = (type: GraphEdge['type']): string => {
    const colors = {
      imports: '#60A5FA',
      exports: '#34D399',
      depends: '#FBBF24',
      calls: '#F87171',
    };
    return colors[type];
  };

  const handleZoomIn = () => setScale(s => Math.min(s * 1.2, 3));
  const handleZoomOut = () => setScale(s => Math.max(s / 1.2, 0.5));
  const handleReset = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="cursor-grab active:cursor-grabbing"
      />
      <div className="absolute bottom-4 right-4 flex gap-2">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleZoomIn}
          className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg"
        >
          <ZoomIn className="w-4 h-4" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleZoomOut}
          className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg"
        >
          <ZoomOut className="w-4 h-4" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleReset}
          className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg"
        >
          <Maximize2 className="w-4 h-4" />
        </motion.button>
      </div>
      <div className="absolute top-4 left-4 p-2 bg-gray-800/80 backdrop-blur rounded-lg">
        <div className="flex items-center gap-2 text-sm">
          <Layers className="w-4 h-4 text-purple-400" />
          <span>Dependency Graph</span>
        </div>
      </div>
    </div>
  );
}
