const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'painel-senhas-dev-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '12h';

if (!process.env.JWT_SECRET) {
  // Com a chave padrão (pública no repositório) qualquer um forjaria um token de administrador
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET precisa estar definido no .env em produção');
  }
  console.warn('⚠️  JWT_SECRET não definido no .env — usando chave de desenvolvimento');
}

// Cookie httpOnly da sessão: o JavaScript da página não consegue lê-lo (protege contra XSS)
const SESSION_COOKIE = 'painel_session';

function signToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

function cookieOptions() {
  return {
    httpOnly: true,
    // Lax: o navegador não envia o cookie em requisições vindas de outros sites (CSRF)
    sameSite: 'lax',
    // Ative COOKIE_SECURE=true quando o sistema for servido por HTTPS
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
  };
}

// Grava o token no cookie da sessão, com a mesma validade do token
function setSessionCookie(res, token) {
  const { exp } = jwt.decode(token);
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions(), maxAge: exp * 1000 - Date.now() });
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, cookieOptions());
}

// Lê um cookie do cabeçalho Cookie (sem depender de cookie-parser)
function readCookie(cookieHeader, name) {
  const match = String(cookieHeader || '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!match) return null;
  try {
    return decodeURIComponent(match.slice(name.length + 1));
  } catch (error) {
    return null;
  }
}

// Token do cookie da sessão ou, para scripts e integrações, do cabeçalho Authorization: Bearer
function tokenFromHeaders(headers = {}) {
  const header = headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return readCookie(headers.cookie, SESSION_COOKIE);
}

// Exige um token válido de um usuário ativo e coloca o usuário em req.user
async function requireAuth(req, res, next) {
  const token = tokenFromHeaders(req.headers);
  if (!token) {
    return res.status(401).json({ error: 'Autenticação necessária' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user || !user.active) {
      return res.status(401).json({ error: 'Usuário inválido ou desativado' });
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Sessão expirada ou inválida' });
  }
}

// Usuário ativo dono do token, ou null se o token for inválido
async function userFromToken(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.sub);
    return user && user.active ? user : null;
  } catch (error) {
    return null;
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso não permitido' });
    }
    next();
  };
}

// Compara segredos em tempo constante (não revela quantos caracteres acertou)
function safeEqual(received, expected) {
  const a = Buffer.from(String(received || ''));
  const b = Buffer.from(String(expected));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Totens precisam enviar o cabeçalho X-Totem-Token quando TOTEM_TOKEN estiver definido
function requireTotem(req, res, next) {
  const expected = process.env.TOTEM_TOKEN;
  if (!expected || safeEqual(req.get('X-Totem-Token'), expected)) return next();
  res.status(403).json({ error: 'Totem não autorizado' });
}

module.exports = {
  signToken,
  setSessionCookie,
  clearSessionCookie,
  tokenFromHeaders,
  userFromToken,
  requireAuth,
  requireRole,
  requireTotem,
  safeEqual,
};
