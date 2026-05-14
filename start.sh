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

# Inicializar banco de dados com tipos de atendimento padrão
echo "📊 Inicializando banco de dados..."
cat > /tmp/init_db.js << 'EOF'
const mongoose = require('mongoose');
const ServiceType = require('./backend/src/models/ServiceType');

mongoose.connect('mongodb://localhost:27017/painel_senhas');

const defaultServices = [
  { name: 'Exame', prefix: 'A', description: 'Coleta de sangue e exames' },
  { name: 'Consulta', prefix: 'B', description: 'Consulta médica geral' },
  { name: 'Vacinação', prefix: 'C', description: 'Aplicação de vacinas' },
  { name: 'Curativos', prefix: 'D', description: 'Curativos e feridas' },
  { name: 'Recepção', prefix: 'E', description: 'Atendimento de recepção' }
];

ServiceType.insertMany(defaultServices)
  .then(() => {
    console.log('✓ Banco de dados inicializado com sucesso!');
    process.exit(0);
  })
  .catch(err => {
    console.error('✗ Erro ao inicializar banco:', err);
    process.exit(1);
  });
EOF

sleep 2

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
