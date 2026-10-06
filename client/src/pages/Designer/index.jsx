import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, LogIn, Sparkles, X } from 'lucide-react';
import CakeScene from '@/components/cake/CakeScene';
import ToolPanel from '@/components/cake/ToolPanel';
import PricingPanel from '@/components/cake/PricingPanel';
import { DEFAULT_CONFIG, getCenterItemLimit, getCenterItemCount } from '@/lib/cakeConfig';
import { adaptConfigToLegacy } from '@/lib/configAdapter';
import { useAuth } from '@/lib/AuthContext';

const defaultCakeConfig = DEFAULT_CONFIG;

function getActiveToolLabel(tool) {
  if (!tool) return null;
  const rawType = typeof tool === 'object' ? (tool.label || tool.type || '') : String(tool);
  if (rawType.includes('strawberry')) return 'Strawberry';
  if (rawType.includes('letterUpper') || rawType.includes('letterLower') || rawType.includes('number') || rawType.includes('center-letter') || rawType.includes('text')) {
    const letter = typeof tool === 'object' && tool.letter ? tool.letter : '';
    return letter ? `Letter "${letter}"` : 'Center Letter / Text';
  }
  if (rawType.includes('flower') || rawType.includes('rose')) return 'Flower';
  if (rawType.includes('piping')) return 'Piping';
  if (typeof tool === 'object' && tool.label) return tool.label;
  const cleaned = rawType.replace(/^center-/, '').replace(/-default$/, '').replace(/-/g, ' ');
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : 'Decoration';
}

export default function Designer() {
  const { account, isAuthenticated, isLoadingAuth } = useAuth();
  const [cakeConfig, setCakeConfig] = useState(defaultCakeConfig);
  const [activeTool, setActiveTool] = useState(null);

  // Logged in users cannot access guest designer page
  if (!isLoadingAuth && isAuthenticated && account) {
    if (account.role === 'customer') {
      return <Navigate to="/designer" replace />;
    }
    if (['bakery_staff', 'bakery_admin', 'platform_admin'].includes(account.role)) {
      return <Navigate to="/bakery/orders" replace />;
    }
  }

  const handleConfigChange = (newConfig) => {
    setCakeConfig(newConfig);
  };

  const handleReset = () => {
    setCakeConfig(defaultCakeConfig);
    setActiveTool(null);
  };

  const handlePlace = (item) => {
    if (item?.type && typeof item.type === 'string' && item.type.startsWith('center-')) {
      const designId = item.type.split('-')[1];
      const limit = getCenterItemLimit(designId);
      if (limit !== null) {
        const count = getCenterItemCount(cakeConfig.placedItems || [], designId);
        if (count >= limit) {
          setActiveTool(null);
          return;
        }
        if (count + 1 >= limit) {
          setActiveTool(null);
        }
      }
    }
    setCakeConfig(prev => ({
      ...prev,
      placedItems: [...(prev.placedItems || []), item]
    }));
  };

  // Convert config to legacy format for rendering
  const legacyConfig = adaptConfigToLegacy(cakeConfig);

  return (
    <div className="h-[100dvh] w-full max-w-full flex flex-col overflow-hidden bg-background">
      {/* Top Header Navigation for Guest Designer */}
      <header className="flex items-center justify-between gap-2 px-3 sm:px-6 py-2.5 sm:py-3 border-b border-border/40 bg-card/90 backdrop-blur-md z-20 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link
            to="/"
            className="shrink-0 rounded-xl px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-primary hover:bg-primary/10 transition-colors flex items-center gap-1.5"
            title="Back to home"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </Link>
          <div className="h-4 w-px bg-border/60 mx-1 hidden sm:block" />
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-display text-sm sm:text-base font-bold text-foreground truncate">
              Guest Designer
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium bg-amber-100/80 text-amber-900 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40 shrink-0">
              <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span>Guest Preview</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-semibold shadow-sm hover:bg-primary/90 transition-colors"
            title="Sign in to save and order your cake"
          >
            <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Sign in to save</span>
          </Link>
        </div>
      </header>

      {/* Main Designer Workspace */}
      <div className="flex-1 min-h-0 w-full max-w-full flex flex-col lg:flex-row overflow-hidden bg-gradient-to-br from-pink-50 to-orange-50">
        {/* Left: Pricing Panel */}
        <div className="w-full lg:w-64 p-3 lg:p-4 flex flex-col shrink-0">
          <PricingPanel config={cakeConfig} />
        </div>

        {/* Center: 3D Cake Scene */}
        <div className="flex-1 min-w-0 min-h-0 p-3 lg:p-6 relative">
        <div className="h-full rounded-2xl shadow-2xl overflow-hidden bg-white/80 backdrop-blur-sm border border-white/50 relative">
          <CakeScene 
            cakeConfig={legacyConfig}
            activeTool={activeTool}
            onSelectTool={setActiveTool}
            onPlace={handlePlace}
          />

          {/* Placement Mode Active Floating Indicator Banner */}
          <AnimatePresence>
            {Boolean(activeTool) && (
              <motion.div
                key="placement-mode-floating-indicator"
                initial={{ opacity: 0, y: -16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto max-w-[calc(100vw-2rem)]"
              >
                <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-card/95 border border-primary/30 shadow-xl backdrop-blur-md text-foreground">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                  </span>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-primary truncate">
                      <span>Placement Mode Active</span>
                      <span className="text-[11px] font-semibold text-foreground/80 truncate">
                        ({getActiveToolLabel(activeTool)})
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground leading-tight truncate">
                      Tap or drag on cake to place. Drag & drop is active.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTool(null)}
                    className="ml-1 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
                    title="Exit Placement Mode"
                    aria-label="Exit Placement Mode"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right: Tool Panel */}
      <div className="w-full lg:w-96 p-3 lg:p-6 shrink-0 overflow-y-auto">
        <ToolPanel 
          config={cakeConfig}
          onChange={handleConfigChange}
          onReset={handleReset}
          activeTool={activeTool}
          onSelectTool={setActiveTool}
        />
      </div>
    </div>
  </div>
);
}
