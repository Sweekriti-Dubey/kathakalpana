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
        style={{
          ...floatingStyles,  
          background: 'rgba(19, 17, 32, 0.92)',       
          border: '1px solid rgba(167, 139, 250, 0.2)', 
          borderRadius: '16px',
          backdropFilter: 'blur(12px)',                
          padding: '14px 16px',
          width: 260,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          zIndex: 9999,                                
          animation: 'tooltipFadeIn 0.18s ease-out',
        }}
      >
        
        <button
          onClick={onClose}
          aria-label="Close tooltip"
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: '16px',
            lineHeight: 1,
            padding : '4px',
          }}
        >
          ✕
        </button>
      
        <div style={{
          color: '#a78bfa',
          fontSize: '13px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '6px',
          paddingRight: '20px',
        }}>
          {state.word}
        </div>

        {state.loading ? (
          <div style = {{ display:'flex', gap: '4px', paddingTop: '4px'}}>
            {[0, 1, 2].map((i) => (
              <span
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: '#a78bfa',
                display: 'inline-block',
                animation: `tooltipBounce 0.6s ease-in-out ${i * 0.15}s infinite`,
              
              }}
              />
            ))}
        
      </div>
        ) : state.error ? (
          <div style = {{ color: '#f87171', fontSize: '13px'}}>
            Couldn't load meaning
          </div>
        ) : (
          <div style = {{
            color: '#e2e8f0',
            fontSize: '14px',
            lineHeight: 1.6,
          }}>
            {state.meaning}
            </div>
        )}

        <div 
          ref = {arrowRef}
          style = {{
            position: 'absolute',
            width: 10,
            height: 10,
            background: 'rgba(19, 17, 32, 0.92)',
            border: '1px solid rgba(167, 139, 250, 0.2)',
            borderTop: arrowSide === 'bottom' ? 'none' : undefined,
            borderLeft: arrowSide === 'bottom' ? 'none' : undefined,
            borderBottom: arrowSide === 'top'? 'none' : undefined,
            borderRight: arrowSide === 'top' ? 'none': undefined,
            transform: 'rotate(45deg)',
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