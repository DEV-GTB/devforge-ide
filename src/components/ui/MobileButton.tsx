import React from 'react';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { useDeviceDetection } from '../../hooks/useDeviceDetection';

interface MobileButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
}

export function MobileButton({
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
}: MobileButtonProps) {
  const deviceInfo = useDeviceDetection();
  const isMobile = deviceInfo.isMobile || deviceInfo.isSmallMobile;

  const variants = {
    primary: 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20',
    secondary: 'bg-gray-700 hover:bg-gray-600 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20',
    ghost: 'bg-transparent hover:bg-gray-800 text-gray-300',
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-sm',
    lg: 'px-6 py-4 text-base',
  };

  const mobileSizes = {
    sm: 'px-4 py-3 text-sm',
    md: 'px-5 py-4 text-base',
    lg: 'px-6 py-5 text-lg',
  };

  const activeSizes = isMobile ? mobileSizes : sizes;

  return (
    <motion.button
      whileHover={!disabled && !loading ? { scale: 1.02 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${variants[variant]}
        ${activeSizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}
        rounded-xl font-medium transition-all flex items-center justify-center gap-2
        ${className}
      `}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </motion.button>
  );
}
