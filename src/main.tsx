// Copied from math-soccer src/main.tsx.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app/App';
import { ErrorBoundary } from './app/ErrorBoundary';
import './app/styles.css';
import { BUILD_VERSION } from './app/buildInfo';
import { swUpdate } from './app/swUpdate';
import { requestPersistentStorage } from './core/storage/storage';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root is missing from index.html');
}

// The running build on the page (`data-version`), so tests and a parent with the browser tools can see which build
// runs.
document.documentElement.dataset.version = BUILD_VERSION;

// The service worker precaches the game for offline play; a new version waits for the start screen.
swUpdate.install(registerSW);

// Ask once on start that the browser keeps the stored data when space runs low.
void requestPersistentStorage(navigator.storage);

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
