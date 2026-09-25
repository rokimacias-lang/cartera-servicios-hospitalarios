import React from 'react';import{createRoot}from'react-dom/client';import App from './App.jsx';import './styles.css';import SigcasAuthGate from './SigcasAuthGate.jsx';
createRoot(document.getElementById('root')).render(<SigcasAuthGate><App/></SigcasAuthGate>);
