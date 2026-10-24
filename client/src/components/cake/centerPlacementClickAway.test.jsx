import { describe, it, expect, vi } from 'vitest';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import DesignerTutorial from '../tutorial/DesignerTutorial';
import { TUTORIAL_STEPS } from '../tutorial/tutorialSteps';

describe('Center Placement Mode and Decoration Selection Click-away', () => {
  it('restores Placement Mode Active if user had it before selecting a decoration, then clicks away', () => {
    const { result } = renderHook(() => {
      const [activeTool, setActiveTool] = useState(null);
      const activeToolRef = useRef(activeTool);
      useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);

      const [selectedCenterItemId, setSelectedCenterItemId] = useState(null);
      const selectedCenterItemIdRef = useRef(selectedCenterItemId);
      useEffect(() => { selectedCenterItemIdRef.current = selectedCenterItemId; }, [selectedCenterItemId]);

      const lastActiveToolBeforeSelectionRef = useRef(null);

      const handleSelectTool = useCallback((tool) => {
        if (tool) {
          lastActiveToolBeforeSelectionRef.current = null;
          setActiveTool(tool);
        } else {
          if (!selectedCenterItemIdRef.current) {
            lastActiveToolBeforeSelectionRef.current = null;
          }
          setActiveTool(null);
        }
      }, []);

      const handleCenterItemSelect = useCallback((id) => {
        if (id) {
          if (activeToolRef.current) {
            lastActiveToolBeforeSelectionRef.current = activeToolRef.current;
          }
          selectedCenterItemIdRef.current = id;
          setSelectedCenterItemId(id);
          setActiveTool(null);
        } else {
          selectedCenterItemIdRef.current = null;
          setSelectedCenterItemId(null);
          if (lastActiveToolBeforeSelectionRef.current) {
            setActiveTool(lastActiveToolBeforeSelectionRef.current);
            lastActiveToolBeforeSelectionRef.current = null;
          }
        }
      }, []);

      return {
        activeTool,
        selectedCenterItemId,
        handleSelectTool,
        handleCenterItemSelect,
      };
    });

    // 1. User arms tool (Placement Mode Active)
    act(() => {
      result.current.handleSelectTool('center-strawberry');
    });
    expect(result.current.activeTool).toBe('center-strawberry');
    expect(result.current.selectedCenterItemId).toBeNull();

    // 2. User selects an existing decoration (Decoration selected mode)
    act(() => {
      result.current.handleCenterItemSelect('item-123');
    });
    expect(result.current.selectedCenterItemId).toBe('item-123');
    expect(result.current.activeTool).toBeNull();

    // 3. User clicks away (exits Decoration selected mode)
    act(() => {
      result.current.handleCenterItemSelect(null);
    });
    expect(result.current.selectedCenterItemId).toBeNull();
    // Placement Mode Active should be restored!
    expect(result.current.activeTool).toBe('center-strawberry');
  });

  it('does NOT activate Placement Mode if user was never in Placement Mode when selecting decoration', () => {
    const { result } = renderHook(() => {
      const [activeTool, setActiveTool] = useState(null);
      const activeToolRef = useRef(activeTool);
      useEffect(() => { activeToolRef.current = activeTool; }, [activeTool]);

      const [selectedCenterItemId, setSelectedCenterItemId] = useState(null);
      const selectedCenterItemIdRef = useRef(selectedCenterItemId);
      useEffect(() => { selectedCenterItemIdRef.current = selectedCenterItemId; }, [selectedCenterItemId]);

      const lastActiveToolBeforeSelectionRef = useRef(null);

      const handleSelectTool = useCallback((tool) => {
        if (tool) {
          lastActiveToolBeforeSelectionRef.current = null;
          setActiveTool(tool);
        } else {
          if (!selectedCenterItemIdRef.current) {
            lastActiveToolBeforeSelectionRef.current = null;
          }
          setActiveTool(null);
        }
      }, []);

      const handleCenterItemSelect = useCallback((id) => {
        if (id) {
          if (activeToolRef.current) {
            lastActiveToolBeforeSelectionRef.current = activeToolRef.current;
          }
          selectedCenterItemIdRef.current = id;
          setSelectedCenterItemId(id);
          setActiveTool(null);
        } else {
          selectedCenterItemIdRef.current = null;
          setSelectedCenterItemId(null);
          if (lastActiveToolBeforeSelectionRef.current) {
            setActiveTool(lastActiveToolBeforeSelectionRef.current);
            lastActiveToolBeforeSelectionRef.current = null;
          }
        }
      }, []);

      return {
        activeTool,
        selectedCenterItemId,
        handleSelectTool,
        handleCenterItemSelect,
      };
    });

    // 1. User starts with no tool armed
    expect(result.current.activeTool).toBeNull();

    // 2. User selects an existing decoration
    act(() => {
      result.current.handleCenterItemSelect('item-456');
    });
    expect(result.current.selectedCenterItemId).toBe('item-456');
    expect(result.current.activeTool).toBeNull();

    // 3. User clicks away
    act(() => {
      result.current.handleCenterItemSelect(null);
    });
    expect(result.current.selectedCenterItemId).toBeNull();
    // Should NOT become active
    expect(result.current.activeTool).toBeNull();
  });
});

describe('DesignerTutorial mobile layout for Steps 1 and 2', () => {
  it('places the tutorial message box at the bottom on mobile for Step 1 and 2', () => {
    // Set window dimensions to mobile view
    window.innerWidth = 375;
    window.innerHeight = 812;

    const { rerender } = render(
      <DesignerTutorial
        isOpen={true}
        currentStepIndex={0}
        isStepDone={false}
        onStepChange={() => {}}
        onComplete={() => {}}
        onSkip={() => {}}
      />
    );

    const cardStep1 = screen.getByText('Rotate the cake').closest('[data-tutorial-card="true"]');
    expect(cardStep1).toBeTruthy();
    const topValueStep1 = parseInt(cardStep1.style.top, 10);
    expect(topValueStep1).toBe(626);

    const { unmount } = render(
      <DesignerTutorial
        isOpen={true}
        currentStepIndex={1}
        isStepDone={false}
        onStepChange={() => {}}
        onComplete={() => {}}
        onSkip={() => {}}
      />
    );
    const cardStep2 = screen.getByText('Zoom').closest('[data-tutorial-card="true"]');
    const topValueStep2 = parseInt(cardStep2.style.top, 10);
    expect(topValueStep2).toBe(626);
  });

  it('places the tutorial message box at the bottom on mobile for Step 8 Place it and Select an item', () => {
    window.innerWidth = 375;
    window.innerHeight = 812;

    const placeIdx = TUTORIAL_STEPS.findIndex((s) => s.id === 'center-place');
    render(
      <DesignerTutorial
        isOpen={true}
        currentStepIndex={placeIdx}
        isStepDone={false}
        onStepChange={() => {}}
        onComplete={() => {}}
        onSkip={() => {}}
      />
    );

    const cardPlace = screen.getByText('Place it').closest('[data-tutorial-card="true"]');
    expect(cardPlace).toBeTruthy();
    const topValuePlace = parseInt(cardPlace.style.top, 10);
    expect(topValuePlace).toBe(626);

    const selectIdx = TUTORIAL_STEPS.findIndex((s) => s.id === 'center-select');
    render(
      <DesignerTutorial
        isOpen={true}
        currentStepIndex={selectIdx}
        isStepDone={false}
        onStepChange={() => {}}
        onComplete={() => {}}
        onSkip={() => {}}
      />
    );

    const cardSelect = screen.getByText('Select an item').closest('[data-tutorial-card="true"]');
    expect(cardSelect).toBeTruthy();
    const topValueSelect = parseInt(cardSelect.style.top, 10);
    expect(topValueSelect).toBe(626);
  });
});
