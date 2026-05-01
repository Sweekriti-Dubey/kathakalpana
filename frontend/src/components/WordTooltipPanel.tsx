import React, { useRef, useEffect } from 'react';
import {
  useFloating,
  offset,
  flip,
  shift,
  arrow,
  autoUpdate,
  FloatingPortal
} from '@floating-ui/react';
import type { TooltipState } from '../hooks/useWordTooltip';


interface Props {
  state: TooltipState | null;
  onClose: () => void;
}

const WordTooltipPanel: React.FC<Props> = ({state, onClose }) => {
  const arrowRef = useRef<HTMLDivElement>(null);

  const { refs, floatingStyles, placement, middlewareData } = useFloating({
    placement: 'top',
    middleware:[
      offset(10),
      flip(),
      shift({ padding: 12 }),
      arrow({ element: arrowRef }),
    ],
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
    if(state?.anchor) {
      const rect = state.anchor.getBoundingClientRect();
      console.log('Floating UI anchor position:', { top: rect.top, left: rect.left, word: state?.word });
      refs.setReference(state.anchor);
    }
  },[state?.anchor, refs]);

  if(!state) return null;

  const arrowX = middlewareData.arrow?.x;
  const arrowY = middlewareData.arrow?.y;
  const arrowSide = placement === 'top' ? 'bottom' : 'top';

  return (
    <FloatingPortal>
      <div
        ref={refs.setFloating}
        className="tooltip-panel"
        style={floatingStyles}
      >
        
        <button
          onClick={onClose}
          aria-label="Close tooltip"
          className="tooltip-close"
        >
          ✕
        </button>
      
        <div className="tooltip-word">
          {state.word}
        </div>

        {state.loading ? (
          <div className="tooltip-loading">
            {[0, 1, 2].map((i) => (
              <span
              key={i}
              className="tooltip-bounce-dot"
              style={{
                animationDelay: `${i * 0.15}s`,
              }}
              />
            ))}
        
      </div>
        ) : state.error ? (
          <div className="tooltip-error">
            Couldn't load meaning
          </div>
        ) : (
          <div className="tooltip-meaning">
            {state.meaning}
            </div>
        )}

        <div 
          ref={arrowRef}
          className="tooltip-arrow"
          style={{
            left: arrowX != null ? arrowX : undefined,
            top: arrowY != null ? arrowY : undefined,
            [arrowSide]: '-6px',
          }}
          />
          </div>

          <style>{`
             @keyframes tooltipBounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-6px); }
              }
             @keyframes tooltipFadeIn {
               from { opacity: 0; transform: ${floatingStyles.transform ?? ''} translateY(6px); }
               to { opacity: 1; transform: ${floatingStyles.transform ?? ''} translateY(0); }
              }
           `}
          </style>
      </FloatingPortal>
    
  );
};

export default WordTooltipPanel;

/* Tooltip component styles */