import React, { useState } from 'react';
import CakeScene from '@/components/cake/CakeScene';
import ToolPanel from '@/components/cake/ToolPanel';
import PricingPanel from '@/components/cake/PricingPanel';
import { DEFAULT_CONFIG } from '@/lib/cakeConfig';
import { adaptConfigToLegacy } from '@/lib/configAdapter';

const defaultCakeConfig = DEFAULT_CONFIG;

export default function Designer() {
  const [cakeConfig, setCakeConfig] = useState(defaultCakeConfig);
  const [activeTool, setActiveTool] = useState(null);

  const handleConfigChange = (newConfig) => {
    setCakeConfig(newConfig);
  };

  const handleReset = () => {
    setCakeConfig(defaultCakeConfig);
    setActiveTool(null);
  };

  const handlePlace = (item) => {
    setCakeConfig(prev => ({
      ...prev,
      placedItems: [...(prev.placedItems || []), item]
    }));
  };

  // Convert config to legacy format for rendering
  const legacyConfig = adaptConfigToLegacy(cakeConfig);

  return (
    <div className="h-screen w-full flex bg-gradient-to-br from-pink-50 to-orange-50">
      {/* Left: Pricing Panel */}
      <div className="w-64 p-4 flex flex-col">
        <PricingPanel config={cakeConfig} />
      </div>

      {/* Center: 3D Cake Scene */}
      <div className="flex-1 p-6">
        <div className="h-full rounded-2xl shadow-2xl overflow-hidden bg-white/80 backdrop-blur-sm border border-white/50">
          <CakeScene 
            cakeConfig={legacyConfig}
            activeTool={activeTool}
            onPlace={handlePlace}
          />
        </div>
      </div>

      {/* Right: Tool Panel */}
      <div className="w-96 p-6">
        <ToolPanel 
          config={cakeConfig}
          onChange={handleConfigChange}
          onReset={handleReset}
          activeTool={activeTool}
          onSelectTool={setActiveTool}
        />
      </div>
    </div>
  );
}
