import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, Home, Code, Settings, Terminal, Layout, Layers, ChevronRight } from 'lucide-react';
import { useDeviceDetection } from '../../hooks/useDeviceDetection';

export interface NavItem {
  id: string;
  label: string;
  icon: any;
  badge?: number;
  children?: NavItem[];
}

interface ResponsiveNavProps {
  items: NavItem[];
  activeItem?: string;
  onItemClick?: (itemId: string) => void;
  className?: string;
}

export function ResponsiveNav({ items, activeItem, onItemClick, className = '' }: ResponsiveNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const deviceInfo = useDeviceDetection();

  const isMobile = deviceInfo.isMobile || deviceInfo.isSmallMobile;
  const isTablet = deviceInfo.isTablet;

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleItemClick = (itemId: string) => {
    onItemClick?.(itemId);
    if (isMobile) {
      setIsOpen(false);
    }
  };

  const renderMobileNav = () => (
    <>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 p-4 bg-purple-600 rounded-full shadow-lg shadow-purple-500/30"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 z-40"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-80 bg-gray-900 z-50 p-4 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Navigation</h2>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-gray-800 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <NavList
                items={items}
                activeItem={activeItem}
                onItemClick={handleItemClick}
                expandedItems={expandedItems}
                onToggleExpand={toggleExpand}
                isMobile
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );

  const renderTabletNav = () => (
    <div className="flex flex-col gap-1">
      <NavList
        items={items}
        activeItem={activeItem}
        onItemClick={handleItemClick}
        expandedItems={expandedItems}
        onToggleExpand={toggleExpand}
        isMobile={false}
      />
    </div>
  );

  const renderDesktopNav = () => (
    <div className="flex flex-col gap-1">
      <NavList
        items={items}
        activeItem={activeItem}
        onItemClick={handleItemClick}
        expandedItems={expandedItems}
        onToggleExpand={toggleExpand}
        isMobile={false}
      />
    </div>
  );

  return (
    <div className={className}>
      {isMobile ? renderMobileNav() : isTablet ? renderTabletNav() : renderDesktopNav()}
    </div>
  );
}

interface NavListProps {
  items: NavItem[];
  activeItem?: string;
  onItemClick?: (itemId: string) => void;
  expandedItems: Set<string>;
  onToggleExpand: (itemId: string) => void;
  isMobile: boolean;
}

function NavList({ items, activeItem, onItemClick, expandedItems, onToggleExpand, isMobile }: NavListProps) {
  return (
    <div className="space-y-1">
      {items.map((item) => (
        <div key={item.id}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              if (item.children && item.children.length > 0) {
                onToggleExpand(item.id);
              } else {
                onItemClick?.(item.id);
              }
            }}
            className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
              activeItem === item.id
                ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
                : 'hover:bg-gray-800 text-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-red-500 text-white">
                  {item.badge}
                </span>
              )}
            </div>
            {item.children && item.children.length > 0 && (
              <motion.div
                animate={{ rotate: expandedItems.has(item.id) ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronRight className="w-4 h-4" />
              </motion.div>
            )}
          </motion.button>

          <AnimatePresence>
            {item.children && expandedItems.has(item.id) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="ml-4 mt-1 space-y-1 border-l border-gray-700 pl-4"
              >
                {item.children.map((child) => (
                  <motion.button
                    key={child.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onItemClick?.(child.id)}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                      activeItem === child.id
                        ? 'bg-purple-600/20 text-purple-400'
                        : 'hover:bg-gray-800 text-gray-400'
                    }`}
                  >
                    <child.icon className="w-4 h-4" />
                    <span className="text-sm">{child.label}</span>
                    {child.badge && child.badge > 0 && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-red-500 text-white">
                        {child.badge}
                      </span>
                    )}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
