#!/bin/bash

echo "🚀 Iniciando Sistema de Painel de Senhas..."
echo ""

# Verificar se MongoDB está rodando
echo "📦 Verificando MongoDB..."
if ! command -v mongod &> /dev/null; then
    echo "⚠️  MongoDB não está instalado. Usando Docker Compose..."
    docker-compose up -d mongodb
    sleep 3
fi

# Instalar dependências do backend
echo "📦 Instalando dependências do Backend..."
cd backend
npm install
cd ..

# Iniciar o Backend
echo "🚀 Iniciando Backend..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Aguardar backend estar pronto
sleep 3

# Inicializar banco de dados com os tipos de atendimento padrão (só se estiver vazio)
echo "📊 Inicializando banco de dados..."
(cd backend && node seed.js --if-empty)

# Informações de acesso
echo ""
echo "✅ Sistema iniciado com sucesso!"
echo ""
echo "📱 Acesso:"
echo "  Backend:         http://localhost:5000"
echo "  Web Atendente:   http://localhost:3001"
echo "  Painel TV:       http://localhost:3002"
echo ""
echo "💡 Próximos passos:"
echo "  1. Abra http://localhost:3001 para o atendente"
echo "  2. Abra http://localhost:3002 para o painel (TV)"
echo "  3. Use o app mobile para gerar senhas"
echo ""
echo "🛑 Para parar o sistema, pressione Ctrl+C"

wait $BACKEND_PID
