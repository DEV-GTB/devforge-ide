import { useState, useEffect } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type Orientation = 'portrait' | 'landscape';

export interface DeviceInfo {
  type: DeviceType;
  orientation: Orientation;
  screenWidth: number;
  screenHeight: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isSmallMobile: boolean;
  isLargeDesktop: boolean;
}

const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1024,
  largeDesktop: 1440,
  smallMobile: 480,
};

export function useDeviceDetection(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => getDeviceInfo());

  useEffect(() => {
    const handleResize = () => {
      setDeviceInfo(getDeviceInfo());
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return deviceInfo;
}

function getDeviceInfo(): DeviceInfo {
  const width = window.innerWidth;
  const height = window.innerHeight;

  let type: DeviceType;
  if (width < BREAKPOINTS.mobile) {
    type = 'mobile';
  } else if (width < BREAKPOINTS.tablet) {
    type = 'tablet';
  } else {
    type = 'desktop';
  }

  const orientation: Orientation = width > height ? 'landscape' : 'portrait';

  return {
    type,
    orientation,
    screenWidth: width,
    screenHeight: height,
    isMobile: type === 'mobile',
    isTablet: type === 'tablet',
    isDesktop: type === 'desktop',
    isSmallMobile: width < BREAKPOINTS.smallMobile,
    isLargeDesktop: width >= BREAKPOINTS.largeDesktop,
  };
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}
