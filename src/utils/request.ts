import axios, { AxiosError } from 'axios';

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || undefined,
  timeout: 10_000,
});

request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

request.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    let message = '网络请求失败，请稍后重试';

    if (status === 401) {
      message = '登录已过期，请重新登录';
    } else if (status === 403) {
      message = '没有权限执行此操作';
    } else if (status && status >= 500) {
      message = '服务暂时不可用，请稍后重试';
    } else if (error.message) {
      message = error.message;
    }

    console.error(message, error);
    return Promise.reject(error);
  },
);

export default request;
