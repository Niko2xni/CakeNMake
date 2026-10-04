import React from 'react';
import { FLAVORS, FROSTING_FILLING_FLAVOR_ORDER } from '@/lib/cakeFlavors';
import { FINISH_STYLES, BUTTERCREAM_TEXTURES } from '@/lib/cakeConfig';
import SugarColorSection from './SugarColorSection';

export default function ExteriorFinishSection({ exterior, structure, activeLayer, onChange, sugarColor, onSugarColorChange }) {
  const isIndividual = structure.layerDesign === 'individual' && structure.layers > 1;

  const updateStyle = (style) => {
    if (isIndividual) {
      const newLayerStyles = [...(exterior.layerStyles || Array(structure.layers).fill('fullyFrosted'))];
      newLayerStyles[activeLayer] = style;
      onChange({ ...exterior, layerStyles: newLayerStyles });
    } else {
      onChange({
        ...exterior,
        style,
        layerStyles: Array(structure?.layers || 2).fill(style),
      });
    }
  };

  const updateFlavor = (flavor) => {
    if (isIndividual) {
      const newLayerFlavors = [...(exterior.layerFlavors || Array(structure.layers).fill('vanilla'))];
      newLayerFlavors[activeLayer] = flavor;
      onChange({ ...exterior, layerFlavors: newLayerFlavors });
    } else {
      onChange({
        ...exterior,
        flavor,
        layerFlavors: Array(structure?.layers || 2).fill(flavor),
      });
    }
  };

  const updateButtercreamTexture = (buttercreamTexture) => {
    if (isIndividual) {
      const newLayerTextures = [...(exterior.layerButtercreamTextures || Array(structure.layers).fill('ridged'))];
      newLayerTextures[activeLayer] = buttercreamTexture;
      onChange({ ...exterior, layerButtercreamTextures: newLayerTextures });
    } else {
      onChange({
        ...exterior,
        buttercreamTexture,
        layerButtercreamTextures: Array(structure?.layers || 2).fill(buttercreamTexture),
      });
    }
  };

  const getActiveStyle = () => {
    if (isIndividual) {
      return (exterior.layerStyles || [])[activeLayer] || null;  // null means not selected
    }
    return exterior.style || null;  // null means not selected
  };

  const getActiveFlavor = () => {
    if (isIndividual) {
      return (exterior.layerFlavors || [])[activeLayer] || 'vanilla';
    }
    return exterior.flavor || 'vanilla';
  };

  const getActiveButtercreamTexture = () => {
    if (isIndividual) {
      return (exterior.layerButtercreamTextures || [])[activeLayer] || 'ridged';
    }
    return exterior.buttercreamTexture || 'ridged';
  };

  const activeStyle = getActiveStyle();
  // Fully Frosted and Textured Buttercream are both frosted cakes — the
  // latter just applies that same base coat with ridge texture (see
  // cakeConfig.js's comment on exteriorFinish for why it lives here as a
  // third style rather than as a separate overlay). Both need a Frosting
  // Flavor; only Naked doesn't.
  const showFrostingOptions = activeStyle === 'fullyFrosted' || activeStyle === 'texturedButtercream';
  // Only Textured Buttercream has a texture-variant choice — Fully
  // Frosted has no equivalent, it's always the plain smooth coat.
  const showButtercreamTextureOptions = activeStyle === 'texturedButtercream';

  return (
    <div className="space-y-4">
      {/* Finish Style */}
      <div>
        <span className="text-xs text-muted-foreground mb-2 block">
          {isIndividual ? `Tier ${activeLayer + 1} Finish Style` : 'Finish Style'}
        </span>
        <div className="space-y-2">
          {FINISH_STYLES.map((style) => {
            const active = activeStyle === style.id;
            return (
              <button
                key={style.id}
                onClick={() => updateStyle(style.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all duration-200 border-2 ${
                  active
                    ? 'bg-primary text-primary-foreground border-primary shadow-md'
                    : 'bg-muted border-transparent hover:border-primary/30 text-foreground hover:bg-muted/80'
                }`}
              >
                <div>
                  <span className="text-xs font-semibold block">{style.label}</span>
                  <span className={`text-[10px] mt-0.5 block ${active ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                    {style.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Frosting Options — shown for Fully Frosted or Textured Buttercream (both are frosted, one just textured) */}
      {showFrostingOptions && (
        <>
          {/* Buttercream Texture — which of the three ridge/ribbon/piping
              geometries to build (see CakeScene.jsx). Comes before
              Frosting Flavor: it changes the shape being built, the color
              picker just tints whatever shape that is. */}
          {showButtercreamTextureOptions && (
            <div>
              <span className="text-xs text-muted-foreground mb-2 block">
                {isIndividual ? `Tier ${activeLayer + 1} Texture` : 'Buttercream Texture'}
              </span>
              {/* Secondary tier: smaller grid-of-chips (same style as Sugar
                  Color's Match Flavor/Pick Color buttons — grid-cols-2,
                  py-2/px-3/rounded-lg) rather than Finish Style's full-width
                  px-4/py-3/rounded-xl rows above. This is a sub-choice that
                  only exists once Textured Buttercream is already selected,
                  so it needs to read as nested under that choice, not as
                  another top-level option list in the same visual weight. */}
              <div className="grid grid-cols-2 gap-2">
                {BUTTERCREAM_TEXTURES.map((texture) => {
                  const active = getActiveButtercreamTexture() === texture.id;
                  return (
                    <button
                      key={texture.id}
                      onClick={() => updateButtercreamTexture(texture.id)}
                      className={`py-2 px-3 rounded-lg text-left transition-all duration-150 border-2 ${
                        active
                          ? 'bg-primary text-primary-foreground border-primary shadow-md'
                          : 'bg-muted border-transparent text-muted-foreground hover:border-primary/30'
                      }`}
                    >
                      <span className="block text-xs font-semibold">{texture.label}</span>
                      <span className={`block text-[10px] mt-0.5 ${active ? 'text-primary-foreground/80' : 'text-muted-foreground/70'}`}>
                        {texture.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Flavor */}
          <SugarColorSection
            sugarColor={sugarColor}
            exteriorFinish={exterior}
            onChange={onSugarColorChange}
          >
          <div>
            <span className="text-xs text-muted-foreground mb-2 block">
                {isIndividual ? `Tier ${activeLayer + 1} Flavor` : 'Frosting Flavor'}
            </span>
            <div className="grid grid-cols-2 gap-2">
              {FROSTING_FILLING_FLAVOR_ORDER.map((flavorId) => {
                const flavor = FLAVORS[flavorId];
                const active = getActiveFlavor() === flavorId;
                return (
                  <button
                    key={flavorId}
                    onClick={() => updateFlavor(flavorId)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl p-3 text-left transition-all duration-200 border-2 ${
                      active
                        ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02]'
                        : 'bg-muted border-transparent hover:border-primary/30 text-foreground hover:bg-muted/80'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-full border-2 border-black/10"
                      style={{ backgroundColor: flavor.colors.crumbBase }}
                    />
                    <span className="text-xs font-semibold">{flavor.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
          </SugarColorSection>
        </>
      )}

    </div>
  );
}
