import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import { App } from './App';
import { apDungGiaoDien } from './lib/giaoDien';
import './styles.css';
import './cms.css';

apDungGiaoDien();
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
