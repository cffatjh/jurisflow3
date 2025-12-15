import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// #region agent log
// Global error handler
window.addEventListener('error', (event) => {
  fetch('http://127.0.0.1:7242/ingest/468b8283-de18-4f31-b7cb-52da7f0bb927',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:window.error',message:'Global error caught',data:{errorMessage:event.message,errorFilename:event.filename,errorLineno:event.lineno,errorColno:event.colno},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
});
window.addEventListener('unhandledrejection', (event) => {
  fetch('http://127.0.0.1:7242/ingest/468b8283-de18-4f31-b7cb-52da7f0bb927',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:window.unhandledrejection',message:'Unhandled promise rejection',data:{reason:event.reason?.toString()||String(event.reason)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
});
fetch('http://127.0.0.1:7242/ingest/468b8283-de18-4f31-b7cb-52da7f0bb927',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:5',message:'Entry point execution started',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
// #endregion

const rootElement = document.getElementById('root');
// #region agent log
fetch('http://127.0.0.1:7242/ingest/468b8283-de18-4f31-b7cb-52da7f0bb927',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:8',message:'Root element check',data:{rootElementExists:!!rootElement},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
// #endregion
if (!rootElement) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/468b8283-de18-4f31-b7cb-52da7f0bb927',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:10',message:'Root element not found - ERROR',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
// #region agent log
fetch('http://127.0.0.1:7242/ingest/468b8283-de18-4f31-b7cb-52da7f0bb927',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:15',message:'About to render App component',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
// #endregion
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
// #region agent log
fetch('http://127.0.0.1:7242/ingest/468b8283-de18-4f31-b7cb-52da7f0bb927',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.tsx:20',message:'App render call completed',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
// #endregion