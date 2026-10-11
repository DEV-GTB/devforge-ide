import React from 'react';
import { motion } from 'motion/react';
import { Home, Code, Terminal, Layers, Settings } from 'lucide-react';

export interface BottomNavItem {
  id: string;
  label: string;
  icon: any;
  badge?: number;
}

interface BottomNavProps {
  items: BottomNavItem[];
  activeItem?: string;
  onItemClick?: (itemId: string) => void;
  className?: string;
}

export function BottomNav({ items, activeItem, onItemClick, className = '' }: BottomNavProps) {
  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className={`fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-lg border-t border-gray-800 safe-area-bottom ${className}`}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {items.map((item) => {
          const isActive = activeItem === item.id;
          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.9 }}
              onClick={() => onItemClick?.(item.id)}
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors relative"
            >
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute inset-0 bg-purple-600/20 rounded-xl"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <div className="relative">
                <item.icon
                  className={`w-6 h-6 ${isActive ? 'text-purple-400' : 'text-gray-500'}`}
                />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-xs font-medium ${
                  isActive ? 'text-purple-400' : 'text-gray-500'
                }`}
              >
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
