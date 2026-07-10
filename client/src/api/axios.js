import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, attempt a single token refresh then retry the original request.
// Guards:
//   1. Never intercept /auth/refresh itself — prevents infinite loop.
//   2. Only attempt refresh when an accessToken exists in localStorage —
//      a first-time / logged-out visitor has no token so there is nothing to refresh.
//   3. _retry flag ensures each original request is retried at most once.
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    const is401 = error.response?.status === 401;
    const isRefreshEndpoint = original?.url?.includes('/auth/refresh');
    const alreadyRetried = original?._retry === true;
    const hasStoredToken = !!localStorage.getItem('accessToken');

    if (is401 && !isRefreshEndpoint && !alreadyRetried && hasStoredToken) {
      original._retry = true;
      try {
        const { data } = await api.post('/auth/refresh');
        localStorage.setItem('accessToken', data.accessToken);
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        // Refresh failed — clear stored token and let the 401 propagate
        localStorage.removeItem('accessToken');
      }
    }

    return Promise.reject(error);
  }
);

export default api;
