const mongoose = require('mongoose');

// Erro com o status HTTP que a API deve devolver
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const badRequest = (message) => new HttpError(400, message);
const notFound = (message) => new HttpError(404, message);
const conflict = (message) => new HttpError(409, message);

// Garante que o id tem formato de ObjectId antes de consultar o banco
function assertId(id, message) {
  if (!mongoose.isValidObjectId(id)) throw notFound(message);
}

// Envolve rotas async para que erros cheguem ao tratador central do Express
const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

// Tratador central: traduz erros conhecidos do Mongoose para respostas amigáveis
// eslint-disable-next-line no-unused-vars
function errorHandler(error, req, res, next) {
  let status = error.status || 500;
  let message = error.message;

  if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
    status = 400;
  } else if (error.code === 11000) {
    status = 409;
    message = 'Registro duplicado';
  } else if (error.type === 'entity.parse.failed') {
    status = 400;
    message = 'JSON inválido';
  }

  if (status >= 500) {
    console.error('✗ Erro interno:', error);
    if (process.env.NODE_ENV === 'production') message = 'Erro interno do servidor';
  }
  res.status(status).json({ error: message });
}

module.exports = { HttpError, badRequest, notFound, conflict, assertId, asyncHandler, errorHandler };
