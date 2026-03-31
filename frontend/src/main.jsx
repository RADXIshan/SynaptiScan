import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

['warn', 'log', 'error'].forEach((method) => {
  const original = console[method];
  console[method] = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('Using NORM_RECT without IMAGE_DIMENSIONS')) {
      return;
    }
    original(...args);
  };
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
