// VenueOps ERP - Screen Size Indicator Component
// Shows current screen size and breakpoint (for development/testing)

import React, { useState, useEffect } from 'react';
import { Monitor, Laptop, AlertCircle } from 'lucide-react';

interface ScreenSize {
  width: number;
  height: number;
  breakpoint: string;
  category: string;
  color: string;
  icon: React.ReactNode;
  status: 'optimal' | 'good' | 'minimum' | 'warning';
}

export function ScreenSizeIndicator() {
  const [screenSize, setScreenSize] = useState<ScreenSize>({
    width: window.innerWidth,
    height: window.innerHeight,
    breakpoint: 'Unknown',
    category: 'Unknown',
    color: 'bg-gray-500',
    icon: <Monitor className="size-4" />,
    status: 'optimal'
  });

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if dev mode is enabled
    const isDevMode = document.body.hasAttribute('data-dev-mode');
    setIsVisible(isDevMode);

    const updateScreenSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      let info: ScreenSize;

      if (width >= 2560) {
        info = {
          width,
          height,
          breakpoint: '2xl',
          category: 'Large Desktop (27"+)',
          color: 'bg-purple-500',
          icon: <Monitor className="size-4" />,
          status: 'optimal'
        };
      } else if (width >= 1920) {
        info = {
          width,
          height,
          breakpoint: '2xl',
          category: 'Desktop (24")',
          color: 'bg-purple-600',
          icon: <Monitor className="size-4" />,
          status: 'optimal'
        };
      } else if (width >= 1600) {
        info = {
          width,
          height,
          breakpoint: 'xl',
          category: 'Desktop',
          color: 'bg-green-500',
          icon: <Monitor className="size-4" />,
          status: 'optimal'
        };
      } else if (width >= 1366) {
        info = {
          width,
          height,
          breakpoint: 'xl',
          category: 'Laptop (15")',
          color: 'bg-blue-500',
          icon: <Laptop className="size-4" />,
          status: 'good'
        };
      } else if (width >= 1280) {
        info = {
          width,
          height,
          breakpoint: 'xl',
          category: 'Laptop (13")',
          color: 'bg-orange-500',
          icon: <Laptop className="size-4" />,
          status: 'minimum'
        };
      } else {
        info = {
          width,
          height,
          breakpoint: 'base',
          category: 'Too Small',
          color: 'bg-red-500',
          icon: <AlertCircle className="size-4" />,
          status: 'warning'
        };
      }

      setScreenSize(info);
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  if (!isVisible) return null;

  const getScaleFactor = () => {
    if (screenSize.width >= 2560) return '100%';
    if (screenSize.width >= 1920) return '95%';
    if (screenSize.width >= 1600) return '90%';
    if (screenSize.width >= 1366) return '85%';
    if (screenSize.width >= 1280) return '80%';
    return '75%';
  };

  const getStatusIcon = () => {
    switch (screenSize.status) {
      case 'optimal':
        return '✓';
      case 'good':
        return '✓';
      case 'minimum':
        return '!';
      case 'warning':
        return '⚠';
    }
  };

  return (
    <>
      {/* Main Indicator Badge */}
      <div className="fixed bottom-4 right-4 z-[99999] pointer-events-auto">
        <div className={`${screenSize.color} text-white rounded-lg shadow-lg px-3 py-2 text-xs font-medium flex items-center gap-2`}>
          {screenSize.icon}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span>{getStatusIcon()}</span>
              <span>{screenSize.category}</span>
            </div>
            <div className="text-[10px] opacity-90">
              {screenSize.width} × {screenSize.height} • {getScaleFactor()} scale
            </div>
          </div>
        </div>
      </div>

      {/* Warning Banner for Small Screens */}
      {screenSize.status === 'warning' && (
        <div className="fixed top-0 left-0 right-0 z-[99998] bg-red-50 border-b-2 border-red-200">
          <div className="px-4 py-3 flex items-center justify-center gap-3 text-red-800">
            <AlertCircle className="size-5" />
            <div>
              <div className="font-semibold text-sm">Screen Width Too Small</div>
              <div className="text-xs">
                Current: {screenSize.width}px • Minimum recommended: 1280px • Optimal: 1920px+
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Info Panel (Expandable) */}
      <div className="fixed bottom-20 right-4 z-[99999] pointer-events-auto">
        <details className="bg-white rounded-lg shadow-xl border border-gray-200">
          <summary className="px-3 py-2 cursor-pointer text-xs font-medium text-gray-700 hover:bg-gray-50 rounded-lg">
            📊 Screen Info
          </summary>
          <div className="p-4 text-xs border-t">
            <div className="space-y-2">
              <div className="flex justify-between gap-4">
                <span className="text-gray-600">Resolution:</span>
                <span className="font-mono font-semibold">{screenSize.width} × {screenSize.height}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-600">Breakpoint:</span>
                <span className="font-mono font-semibold">{screenSize.breakpoint}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-600">Category:</span>
                <span className="font-semibold">{screenSize.category}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-600">Scale Factor:</span>
                <span className="font-semibold">{getScaleFactor()}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-600">Status:</span>
                <span className={`font-semibold ${
                  screenSize.status === 'optimal' ? 'text-green-600' :
                  screenSize.status === 'good' ? 'text-blue-600' :
                  screenSize.status === 'minimum' ? 'text-orange-600' :
                  'text-red-600'
                }`}>
                  {screenSize.status.charAt(0).toUpperCase() + screenSize.status.slice(1)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-600">Device Pixel Ratio:</span>
                <span className="font-mono">{window.devicePixelRatio}x</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-600">Viewport:</span>
                <span className="font-mono">{window.innerWidth} × {window.innerHeight}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-600">Screen:</span>
                <span className="font-mono">{window.screen.width} × {window.screen.height}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t space-y-1">
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Breakpoint Guide
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <div className="w-3 h-3 rounded bg-purple-500"></div>
                <span className="text-gray-600">1920px+ Large Desktop</span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <div className="w-3 h-3 rounded bg-green-500"></div>
                <span className="text-gray-600">1600px+ Desktop</span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <div className="w-3 h-3 rounded bg-blue-500"></div>
                <span className="text-gray-600">1366px+ Laptop</span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <div className="w-3 h-3 rounded bg-orange-500"></div>
                <span className="text-gray-600">1280px+ Small Laptop</span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <div className="w-3 h-3 rounded bg-red-500"></div>
                <span className="text-gray-600">&lt; 1280px Too Small</span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t">
              <div className="text-[10px] text-gray-500">
                💡 Remove <code className="bg-gray-100 px-1 rounded">data-dev-mode</code> attribute from body tag to hide this indicator
              </div>
            </div>
          </div>
        </details>
      </div>
    </>
  );
}
