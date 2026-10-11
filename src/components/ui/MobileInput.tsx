import React from 'react';
import { motion } from 'motion/react';
import { useDeviceDetection } from '../../hooks/useDeviceDetection';

interface MobileInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'number';
  icon?: React.ReactNode;
  error?: string;
  disabled?: boolean;
  multiline?: boolean;
  rows?: number;
  className?: string;
}

export function MobileInput({
  value,
  onChange,
  placeholder = '',
  type = 'text',
  icon,
  error,
  disabled = false,
  multiline = false,
  rows = 3,
  className = '',
}: MobileInputProps) {
  const deviceInfo = useDeviceDetection();
  const isMobile = deviceInfo.isMobile || deviceInfo.isSmallMobile;

  const inputClassName = `
    w-full bg-gray-800 border rounded-xl transition-all
    ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-600 focus:border-purple-500 focus:ring-purple-500/20'}
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    focus:outline-none focus:ring-2
    ${isMobile ? 'px-4 py-3 text-base' : 'px-4 py-2 text-sm'}
    ${className}
  `;

  return (
    <div className="relative">
      {icon && (
        <div className={`absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 ${isMobile ? 'w-5 h-5' : 'w-4 h-4'}`}>
          {icon}
        </div>
      )}
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          className={`${inputClassName} ${icon ? 'pl-12' : 'pl-4'} resize-none`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`${inputClassName} ${icon ? 'pl-12' : 'pl-4'}`}
        />
      )}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1 text-xs text-red-400"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}
