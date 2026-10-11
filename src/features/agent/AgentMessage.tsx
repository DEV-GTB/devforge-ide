import React from 'react';
import { User, Bot, AlertCircle, Info } from 'lucide-react';

interface AgentMessageProps {
  message: {
    id: string;
    role: 'user' | 'system' | 'assistant';
    content: string;
    timestamp: Date;
  };
}

export default function AgentMessage({ message }: AgentMessageProps) {
  const getIcon = () => {
    switch (message.role) {
      case 'user':
        return <User className="w-4 h-4 text-blue-400" />;
      case 'system':
        return <Info className="w-4 h-4 text-gray-400" />;
      case 'assistant':
        return <Bot className="w-4 h-4 text-purple-400" />;
    }
  };

  const getBgColor = () => {
    switch (message.role) {
      case 'user':
        return 'bg-blue-900/20 border-blue-800';
      case 'system':
        return 'bg-gray-800 border-gray-700';
      case 'assistant':
        return 'bg-purple-900/20 border-purple-800';
    }
  };

  return (
    <div className={`flex gap-3 p-3 rounded-lg border ${getBgColor()}`}>
      <div className="mt-0.5">{getIcon()}</div>
      <div className="flex-1">
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <p className="text-xs text-gray-500 mt-1">
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
