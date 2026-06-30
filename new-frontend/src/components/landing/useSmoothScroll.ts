import { useContext } from 'react';
import { SmoothScrollContext } from './SmoothScrollContext';

export function useSmoothScroll() {
  return useContext(SmoothScrollContext);
}
