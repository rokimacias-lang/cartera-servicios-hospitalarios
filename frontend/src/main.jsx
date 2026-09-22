import React from 'react';
import { createRoot } from 'react-dom/client';
import SigcasApp from './app/SigcasApp.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SigcasApp />
  </React.StrictMode>,
);
