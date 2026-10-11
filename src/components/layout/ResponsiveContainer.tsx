import React from 'react';
import { useDeviceDetection, DeviceType } from '../../hooks/useDeviceDetection';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function ResponsiveContainer({ children, className = '', padding = 'md' }: ResponsiveContainerProps) {
  const deviceInfo = useDeviceDetection();

  const paddingClasses = {
    none: '',
    sm: deviceInfo.isMobile ? 'p-2' : 'p-4',
    md: deviceInfo.isMobile ? 'p-4' : 'p-6',
    lg: deviceInfo.isMobile ? 'p-6' : 'p-8',
  };

  return (
    <div className={`${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  );
}

interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ResponsiveGrid({
  children,
  cols = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 'md',
  className = '',
}: ResponsiveGridProps) {
  const deviceInfo = useDeviceDetection();

  const gridCols = {
    mobile: cols.mobile || 1,
    tablet: cols.tablet || 2,
    desktop: cols.desktop || 3,
  };

  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };

  const columns = deviceInfo.isMobile ? gridCols.mobile : deviceInfo.isTablet ? gridCols.tablet : gridCols.desktop;

  return (
    <div
      className={`grid grid-cols-${columns} ${gapClasses[gap]} ${className}`}
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {children}
    </div>
  );
}

interface ResponsiveFlexProps {
  children: React.ReactNode;
  direction?: {
    mobile?: 'row' | 'column';
    tablet?: 'row' | 'column';
    desktop?: 'row' | 'column';
  };
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  gap?: 'sm' | 'md' | 'lg';
  wrap?: boolean;
  className?: string;
}

export function ResponsiveFlex({
  children,
  direction = { mobile: 'column', tablet: 'row', desktop: 'row' },
  align = 'center',
  justify = 'start',
  gap = 'md',
  wrap = false,
  className = '',
}: ResponsiveFlexProps) {
  const deviceInfo = useDeviceDetection();

  const flexDirection = deviceInfo.isMobile ? direction.mobile : deviceInfo.isTablet ? direction.tablet : direction.desktop;

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  };

  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
  };

  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };

  return (
    <div
      className={`flex ${flexDirection} ${alignClasses[align]} ${justifyClasses[justify]} ${gapClasses[gap]} ${wrap ? 'flex-wrap' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

interface ShowAtDeviceProps {
  children: React.ReactNode;
  device: DeviceType | DeviceType[];
}

export function ShowAtDevice({ children, device }: ShowAtDeviceProps) {
  const deviceInfo = useDeviceDetection();
  const devices = Array.isArray(device) ? device : [device];

  if (devices.includes(deviceInfo.type)) {
    return <>{children}</>;
  }

  return null;
}

interface HideAtDeviceProps {
  children: React.ReactNode;
  device: DeviceType | DeviceType[];
}

export function HideAtDevice({ children, device }: HideAtDeviceProps) {
  const deviceInfo = useDeviceDetection();
  const devices = Array.isArray(device) ? device : [device];

  if (!devices.includes(deviceInfo.type)) {
    return <>{children}</>;
  }

  return null;
}
