import { createContext } from 'react';

interface SmoothScrollContextType {
  scrollTo: (target: string | number, options?: Record<string, unknown>) => void;
}

export const SmoothScrollContext = createContext<SmoothScrollContextType>({
  scrollTo: () => {},
});
