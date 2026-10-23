import React, { useState } from 'react';
import { formatLocation } from '../api';

const POPUP_WIDTH = 340;
const POPUP_HEIGHT = 500;

// Abre o acionador numa janela pequena no canto inferior esquerdo da tela
function openAcionador() {
  const top = Math.max(0, window.screen.availHeight - POPUP_HEIGHT);
  const features = `popup,width=${POPUP_WIDTH},height=${POPUP_HEIGHT},left=0,top=${top}`;
  const popup = window.open(`${window.location.pathname}?view=acionador`, 'acionador', features);
  if (popup) popup.focus();
  return Boolean(popup);
}

function Welcome({ user }) {
  const [blocked, setBlocked] = useState(false);
  const location = formatLocation(user);

  return (
    <div className="welcome">
      <h2>Bem-vindo, {user.name}</h2>
      {location && (
        <p>
          Você está logado em: <strong>{location}</strong>
        </p>
      )}
      <button className="btn btn-primary btn-large" onClick={() => setBlocked(!openAcionador())}>
        Abrir acionador de senhas
      </button>
      {blocked && (
        <p className="form-error">
          O navegador bloqueou a janela. Permita pop-ups para este endereço e tente de novo.
        </p>
      )}
    </div>
  );
}

export default Welcome;
