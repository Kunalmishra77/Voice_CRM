import axios from 'axios';
import { toast } from 'sonner';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3010/api',
  timeout: 15000, // 15s timeout
  headers: {
    'x-api-key': import.meta.env.VITE_API_KEY || 'dev_key_2026',
  },
});

// Response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    
    // Simple 1-time retry on network errors or timeouts
    if (!config || config._retry) {
      const message = error.response?.data?.error || error.message || 'An error occurred';
      console.error('📡 API Error:', message);
      
      // Don't show toast for 404s on metrics as they might be expected during startup
      if (error.response?.status !== 404) {
        toast.error('Connection Error', {
          description: message,
          duration: 4000,
        });
      }
      return Promise.reject(error);
    }

    config._retry = true;
    console.warn('📡 Retrying request...', config.url);
    return api(config);
  }
);

export default api;
