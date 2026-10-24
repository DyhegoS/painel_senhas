const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const {
  signToken,
  setSessionCookie,
  clearSessionCookie,
  requireAuth,
} = require('../middleware/auth');
const { asyncHandler } = require('../errors');
const { createLimiter } = require('../middleware/rateLimit');

// Bloqueio temporário após várias senhas erradas (por IP + login)
const failedLogins = createLimiter({ windowMs: 15 * 60 * 1000, max: 10 });

function loginKey(req) {
  return `${req.ip}|${String((req.body && req.body.username) || '').toLowerCase().trim()}`;
}

// Login
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const key = loginKey(req);
    if (failedLogins.blocked(key)) {
      return res
        .status(429)
        .json({ error: 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.' });
    }

    const { username, password } = req.body || {};
    const user = await userController.authenticate(username, password);
    if (!user) {
      failedLogins.hit(key);
      return res.status(401).json({ error: 'Login ou senha inválidos' });
    }
    failedLogins.reset(key);
    // O token vai só no cookie httpOnly: o navegador o envia sozinho e a página nunca o vê
    setSessionCookie(res, signToken(user));
    res.json({ user: user.toPublic() });
  })
);

// Logout: apaga o cookie da sessão
router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ message: 'Sessão encerrada' });
});

// Usuário da sessão atual
router.get('/me', requireAuth, (req, res) => {
  res.json(req.user.toPublic());
});

module.exports = router;
