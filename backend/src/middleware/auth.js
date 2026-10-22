const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'painel-senhas-dev-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '12h';

if (!process.env.JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET não definido no .env — usando chave de desenvolvimento');
}

function signToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

// Exige um token válido de um usuário ativo e coloca o usuário em req.user
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
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

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso não permitido' });
    }
    next();
  };
}

module.exports = { signToken, requireAuth, requireRole };
