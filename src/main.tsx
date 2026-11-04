import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('No se encontró el contenedor raíz de RapiJob.');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
