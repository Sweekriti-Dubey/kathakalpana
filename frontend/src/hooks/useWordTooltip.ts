import { useState, useRef } from 'react';


export interface VirtualAnchor {
  getBoundingClientRect: () => DOMRect;
}

export interface TooltipState {
  word: string;
  meaning: string | null;
  loading: boolean;
  error: boolean;
  anchor: VirtualAnchor;  
}

const cache = new Map<string, string>();

export function useWordTooltip() {
  const [state, setState] = useState<TooltipState | null>(null);
  const currentElRef = useRef<HTMLElement | null>(null);

  const open = async (word: string, el: HTMLElement) => {
    if (currentElRef.current === el) {
      close();
      return;
    }

   
    const rect = el.getBoundingClientRect();
    const virtualAnchor: VirtualAnchor = {
      getBoundingClientRect: () => rect,
    };
    currentElRef.current = el;

    if (cache.has(word)) {
      setState({
        word,
        meaning: cache.get(word)!,
        loading: false,
        error: false,
        anchor: virtualAnchor,
      });
      return;
    }

    setState({
      word,
      meaning: null,
      loading: true,
      error: false,
      anchor: virtualAnchor,
    });

    try {
      const response = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`
      );
      if (!response.ok) throw new Error('Not found');
      const data = await response.json();
      const definition = data[0]?.meanings[0]?.definitions[0]?.definition;

      if (definition) {
        cache.set(word, definition);
        setState({
          word,
          meaning: definition,
          loading: false,
          error: false,
          anchor: virtualAnchor,
        });
      } else {
        throw new Error('No definition found');
      }
    } catch {
      setState({
        word,
        meaning: null,
        loading: false,
        error: true,
        anchor: virtualAnchor,
      });
    }
  };

  const close = () => {
    currentElRef.current = null;
    setState(null);
  };

  return { state, open, close };
}