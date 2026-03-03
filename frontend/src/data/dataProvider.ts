import { MockProvider } from './providers/MockProvider';
import type { IDataProvider } from './IDataProvider';

// Read from env, fallback to 'mock'
const providerType = import.meta.env.VITE_DATA_PROVIDER || 'mock';

let activeProvider: IDataProvider;

if (providerType === 'mock') {
  activeProvider = new MockProvider();
} else {
  // Future: activeProvider = new SupabaseProvider();
  activeProvider = new MockProvider();
}

export const dataProvider = activeProvider;
