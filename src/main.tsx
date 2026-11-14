// Placeholder entry for the setup phase (T009). T027 replaces it with math-soccer's src/main.tsx, adapted.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { t } from './i18n';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root is missing from index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <h1>{t().appName}</h1>
  </StrictMode>,
);
