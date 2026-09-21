import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from '@/lib/cakeConfig';
import ToolPanel from './ToolPanel';

vi.mock('./sections/CakeStructureSection', () => ({ default: () => <div>Cake structure controls</div> }));
vi.mock('./sections/SpongeFlavorSection', () => ({
  default: ({ sponge, onChange }) => (
    <button onClick={() => onChange({ ...sponge, flavor: 'chocolate' })}>Choose chocolate sponge</button>
  ),
}));
vi.mock('./sections/FillingSection', () => ({
  default: ({ filling, onChange }) => (
    <button onClick={() => onChange({ ...filling, enabled: true, flavor: 'strawberry' })}>Choose strawberry filling</button>
  ),
}));
vi.mock('./sections/ExteriorFinishSection', () => ({
  default: ({ exterior, onChange }) => (
    <button onClick={() => onChange({ ...exterior, style: 'fullyFrosted' })}>Choose fully frosted</button>
  ),
}));
vi.mock('./sections/SugarColorSection', () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock('./sections/SurfaceTreatmentSection', () => ({ default: () => <div>Surface controls</div> }));
vi.mock('./sections/CenterSection', () => ({ default: () => <div>Center controls</div> }));
vi.mock('./sections/EdgeSection', () => ({ default: () => <div>Edge controls</div> }));
vi.mock('./sections/SideSection', () => ({ default: () => <div>Side controls</div> }));
vi.mock('./sections/PlaceSection', () => ({ default: () => <div>Place controls</div> }));
vi.mock('./sections/LayerTabStrip', () => ({ default: () => <div>Layer controls</div> }));
vi.mock('./AIChatPanel', () => ({ default: () => <div>AI controls</div> }));

const coveredConfig = {
  ...DEFAULT_CONFIG,
  exteriorFinish: {
    ...DEFAULT_CONFIG.exteriorFinish,
    style: 'fullyFrosted',
  },
};

const renderPanel = (config = coveredConfig) => {
  const onChange = vi.fn();
  render(
    <ToolPanel
      config={config}
      onChange={onChange}
      onReset={vi.fn()}
      onSelectTool={vi.fn()}
    />,
  );
  return onChange;
};

describe('ToolPanel interior editing', () => {
  it('keeps sponge and filling controls available under a covered finish', () => {
    renderPanel();

    expect(screen.getByRole('button', { name: /sponge flavor/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /^filling/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /choose chocolate sponge/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /choose strawberry filling/i })).toBeEnabled();
  });

  it('shows a covered sponge change in the inside view without losing the selection', () => {
    const onChange = renderPanel();

    fireEvent.click(screen.getByRole('button', { name: /choose chocolate sponge/i }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      sponge: expect.objectContaining({ flavor: 'chocolate' }),
      interiorPreview: true,
    }));
  });

  it('offers labeled outside and inside controls and keeps editing active inside', () => {
    const onChange = renderPanel({ ...coveredConfig, interiorPreview: true });

    expect(screen.getByRole('group', { name: 'View' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Outside' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Inside' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('status')).toHaveTextContent(/inside view: exterior hidden for editing/i);
    expect(screen.getByRole('button', { name: /choose strawberry filling/i })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Outside' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ interiorPreview: false }));
  });

  it('returns to the outside view when the exterior finish is changed', () => {
    const onChange = renderPanel({ ...coveredConfig, interiorPreview: true });

    fireEvent.click(screen.getByRole('button', { name: /choose fully frosted/i }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      exteriorFinish: expect.objectContaining({ style: 'fullyFrosted' }),
      interiorPreview: false,
    }));
  });
});
