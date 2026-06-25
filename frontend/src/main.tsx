/** Точка входа SPA: монтирует App в #root из index.html. */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Глобальный перехватчик fetch для инжектирования токена авторизации
const originalFetch = window.fetch;
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const token = localStorage.getItem('token');
  const newInit = { ...init };
  const headers = new Headers(newInit.headers || {});

  if (token) {
    headers.set('Authorization', `Token ${token}`);
  }

  newInit.headers = headers;
  const response = await originalFetch(input, newInit);

  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    // Сброс страницы при получении 401 ошибки для перехода на форму входа
    window.location.reload();
  }

  return response;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
