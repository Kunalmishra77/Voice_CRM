import { MockProvider } from './providers/MockProvider';
import { BackendProvider } from './providers/BackendProvider';
import type { IDataProvider } from './IDataProvider';

// FORCED TO BACKEND - DISABLED MOCK DATA
let activeProvider: IDataProvider = new BackendProvider();

export const dataProvider = activeProvider;
