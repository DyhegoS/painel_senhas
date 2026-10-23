import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Acionador from './components/Acionador';

// Entry point para a aplicação web de atendentes
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {new URLSearchParams(window.location.search).get('view') === 'acionador' ? (
      <Acionador />
    ) : (
      <App />
    )}
  </React.StrictMode>
);
