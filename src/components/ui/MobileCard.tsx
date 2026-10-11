import React from 'react';
import { motion } from 'motion/react';
import { useDeviceDetection } from '../../hooks/useDeviceDetection';

interface MobileCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'elevated' | 'outlined';
  className?: string;
}

export function MobileCard({
  children,
  title,
  subtitle,
  icon,
  actions,
  onClick,
  variant = 'default',
  className = '',
}: MobileCardProps) {
  const deviceInfo = useDeviceDetection();
  const isMobile = deviceInfo.isMobile || deviceInfo.isSmallMobile;

  const variants = {
    default: 'bg-gray-800',
    elevated: 'bg-gray-800 shadow-xl shadow-gray-900/50',
    outlined: 'bg-gray-800/50 border border-gray-700',
  };

  return (
    <motion.div
      whileHover={onClick ? { scale: 1.02 } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
      onClick={onClick}
      className={`
        ${variants[variant]}
        ${onClick ? 'cursor-pointer' : ''}
        rounded-2xl p-4 transition-all
        ${isMobile ? 'p-4' : 'p-6'}
        ${className}
      `}
    >
      {(title || icon || actions) && (
        <div className={`flex items-start justify-between mb-4 ${isMobile ? 'gap-3' : 'gap-4'}`}>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {icon && (
              <div className={`flex-shrink-0 ${isMobile ? 'w-10 h-10' : 'w-12 h-12'} rounded-xl bg-purple-600/20 flex items-center justify-center text-purple-400`}>
                {icon}
              </div>
            )}
            <div className="flex-1 min-w-0">
              {title && (
                <h3 className={`font-semibold text-white truncate ${isMobile ? 'text-base' : 'text-lg'}`}>
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className={`text-gray-400 truncate ${isMobile ? 'text-sm' : 'text-base'}`}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {actions && (
            <div className="flex-shrink-0 flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      )}
      <div className={isMobile ? 'text-sm' : 'text-base'}>{children}</div>
    </motion.div>
  );
}
