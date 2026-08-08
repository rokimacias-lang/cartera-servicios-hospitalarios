import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

const api = async (path, options={}) => {
  const res = await fetch(path, { headers: { 'Content-Type':'application/json', ...(options.headers||{}) }, credentials:'include', ...options });
  if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
  return res.json();
};

window.storage = {
  async get(key) {
    const data = await api('/api/storage/' + encodeURIComponent(key));
    return data;
  },
  async set(key, value) {
    const data = await api('/api/storage/' + encodeURIComponent(key), { method:'PUT', body: JSON.stringify({ value }) });
    return data.ok;
  }
};

window.carteraApi = { api };

createRoot(document.getElementById('root')).render(<App />);
