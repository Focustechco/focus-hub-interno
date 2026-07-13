import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // 1 second

// Extend config to include retry count
interface RetryConfig extends InternalAxiosRequestConfig {
    _retryCount?: number;
}

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json',
        'Bypass-Tunnel-Reminder': 'true',
    },
    timeout: 300000, // 5 minute timeout for AI processing and rate limits
});

// Add a request interceptor to include the auth token in requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor for automatic retry on network errors
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const config = error.config as RetryConfig;

        // Don't retry if no config or it's a cancel
        if (!config) {
            return Promise.reject(error);
        }

        // Initialize retry count
        config._retryCount = config._retryCount || 0;

        // Check if we should retry
        const shouldRetry =
            config._retryCount < MAX_RETRIES &&
            (
                !error.response || // Network error
                error.response.status >= 500 || // Server error
                error.response.status === 408 || // Request timeout
                error.response.status === 429 // Too many requests
            );

        if (shouldRetry) {
            config._retryCount += 1;

            // Exponential backoff delay
            const delay = RETRY_DELAY_BASE * Math.pow(2, config._retryCount - 1);

            console.warn(`[API] Retry ${config._retryCount}/${MAX_RETRIES} for ${config.url} after ${delay}ms`);

            await new Promise(resolve => setTimeout(resolve, delay));

            return api(config);
        }

        // Transform error message for better UX
        if (error.response) {
            const status = error.response.status;
            const data = error.response.data as any;

            // Use server error message if available
            if (data?.message) {
                error.message = data.message;
            } else if (status === 401) {
                error.message = 'Sessão expirada. Faça login novamente.';
            } else if (status === 403) {
                error.message = 'Você não tem permissão para esta ação.';
            } else if (status === 404) {
                error.message = 'Recurso não encontrado.';
            } else if (status >= 500) {
                error.message = 'Erro no servidor. Tente novamente mais tarde.';
            }
        } else if (error.code === 'ECONNABORTED') {
            error.message = 'Conexão muito lenta. Verifique sua internet.';
        } else if (!navigator.onLine) {
            error.message = 'Sem conexão com a internet.';
        } else {
            error.message = 'Erro de conexão. Verifique sua internet.';
        }

        return Promise.reject(error);
    }
);

export default api;

