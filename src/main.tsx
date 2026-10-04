import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Global error handlers for renderer process
window.addEventListener('error', (event) => {
  try {
    window.electronAPI?.recordCrash?.(
      'Neodchycená chyba v okně (window.onerror)',
      event.error || new Error(event.message),
      {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        message: event.message,
      }
    );
  } catch {}
});

window.addEventListener('unhandledrejection', (event) => {
  try {
    const reason = event.reason;
    window.electronAPI?.recordCrash?.(
      'Neošetřené odmítnutí Promise v okně (unhandledrejection)',
      reason instanceof Error ? reason : new Error(String(reason)),
      { reason: String(reason) }
    );
  } catch {}
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary fallbackTitle="Globální pád aplikace (React)">
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
