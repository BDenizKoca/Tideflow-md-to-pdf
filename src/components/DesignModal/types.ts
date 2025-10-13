import type { Preferences } from '../../types';

export type TabSection = 'themes' | 'document' | 'typography' | 'spacing' | 'structure' | 'images' | 'presets';

export interface TabProps {
  local: Preferences;
  mutate: (patch: Partial<Preferences>) => void;
}
