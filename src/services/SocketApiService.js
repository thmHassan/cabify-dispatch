import axios from "axios";
import { resolveSocketApiBaseUrl } from "../utils/functions/backendUrls";
import { getDecryptedToken, getTenantId } from "../utils/functions/tokenEncryption";

const socketApi = axios.create({
    baseURL: resolveSocketApiBaseUrl(),
    timeout: 20000,
    withCredentials: false, 
    headers: {
        'Content-Type': 'application/json',
    }
});

socketApi.interceptors.request.use(
    (config) => {
        const token = getDecryptedToken();
        const tenantId = getTenantId();

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        if (tenantId) {
            config.headers.database = tenantId;
        }

        // // Log the request for debugging
        // console.log('📤 Socket API Request:', {
        //     url: config.url,
        //     method: config.method,
        //     headers: config.headers,
        //     baseURL: config.baseURL
        // });

        return config;
    },
    (error) => {
        console.error('❌ Request interceptor error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor
socketApi.interceptors.response.use(
    (response) => {
        // console.log('✅ Socket API Response:', response.status, response.data);
        return response;
    },
    (error) => {
        console.error('❌ Socket API Error:', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data,
            url: error.config?.url
        });

        // Handle CORS errors
        if (error.message === 'Network Error') {
            console.error('🚫 CORS or Network Error detected');
        }

        return Promise.reject(error);
    }
);

export default socketApi;