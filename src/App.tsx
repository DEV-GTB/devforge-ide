import React, { useState, useEffect } from 'react';
import { Workbench } from './ui/Workbench';
import { LandingPage } from './ui/LandingPage';
import { getInitialWorkspace } from './services/storageService';

export default function App() {
  // Step 1: Default to Landing Page, with seamless toggle to full-screen IDE Shell
  const [viewMode, setViewMode] = useState<'landing' | 'ide'>('landing');
  const [workspaceState] = useState(() => getInitialWorkspace());

  // Global shortcut: ⌘+Enter or Ctrl+Enter to open IDE
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        setViewMode((prev) => (prev === 'landing' ? 'ide' : 'landing'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (viewMode === 'landing') {
    return <LandingPage onOpenIDE={() => setViewMode('ide')} />;
  }

  return (
    <Workbench
      initialState={workspaceState}
      onExitToLanding={() => setViewMode('landing')}
    />
  );
}
