#!/bin/bash

# Script de inicialização do Sistema de Painel de Senhas
# Use este script para iniciar todos os serviços de desenvolvimento

set -e

echo "🚀 Sistema de Painel de Senhas - Inicialização"
echo "================================================"
echo ""

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não está instalado"
    echo "Baixe em: https://nodejs.org"
    exit 1
fi

echo -e "${GREEN}✓${NC} Node.js instalado"

# Verificar se MongoDB está rodando
if ! command -v mongod &> /dev/null && ! command -v mongo &> /dev/null; then
    echo ""
    echo -e "${BLUE}ℹ${NC} MongoDB não está instalado"
    echo "   Opções:"
    echo "   1. Instalar localmente: https://www.mongodb.com/try/download/community"
    echo "   2. Usar Docker: docker-compose up -d mongodb"
    echo "   3. Usar MongoDB Atlas: Editar .env com connection string"
fi

# Instalar dependências
echo ""
echo -e "${BLUE}📦${NC} Instalando dependências..."

if [ ! -d "node_modules" ]; then
    npm install --silent
fi

if [ ! -d "backend/node_modules" ]; then
    cd backend
    npm install --silent
    cd ..
fi

echo -e "${GREEN}✓${NC} Dependências instaladas"

# Criar arquivo .env se não existir
if [ ! -f "backend/.env" ]; then
    echo ""
    echo -e "${BLUE}⚙${NC}  Criando arquivo .env..."
    cp backend/.env.example backend/.env
    echo -e "${GREEN}✓${NC} Arquivo .env criado"
fi

# Inicializar banco de dados
echo ""
echo -e "${BLUE}🗄${NC}  Inicializando banco de dados..."
cd backend
node seed.js --if-empty || echo "⚠️  Não foi possível inicializar o banco (o MongoDB está rodando?)"
cd ..
echo -e "${GREEN}✓${NC} Banco de dados inicializado"

# Iniciar backend
echo ""
echo -e "${BLUE}🚀${NC} Iniciando Backend..."
echo "   http://localhost:5000"
cd backend
npm run dev &
BACKEND_PID=$!
cd ..
sleep 2

# Instalar web-attendant se necessário
if [ ! -d "web-attendant/node_modules" ]; then
    echo -e "${BLUE}📦${NC} Instalando Web Atendente..."
    cd web-attendant
    npm install --silent
    cd ..
fi

# Instalar web-panel se necessário
if [ ! -d "web-panel/node_modules" ]; then
    echo -e "${BLUE}📦${NC} Instalando Painel TV..."
    cd web-panel
    npm install --silent
    cd ..
fi

# Iniciar web-attendant
echo ""
echo -e "${BLUE}🚀${NC} Iniciando Web Atendente..."
echo "   http://localhost:3000"
cd web-attendant
npm start &
WEB_ATTENDANT_PID=$!
cd ..
sleep 2

# Iniciar web-panel
echo ""
echo -e "${BLUE}🚀${NC} Iniciando Painel TV..."
echo "   http://localhost:3001"
cd web-panel
npm start &
WEB_PANEL_PID=$!
cd ..

# Mostrar informações
echo ""
echo "================================================"
echo -e "${GREEN}✓ Sistema iniciado com sucesso!${NC}"
echo "================================================"
echo ""
echo "📱 Acessar em:"
echo "   Backend:        http://localhost:5000"
echo "   Web Atendente:  http://localhost:3000"
echo "   Painel TV:      http://localhost:3001"
echo ""
echo "🛑 Para parar o sistema: pressione Ctrl+C"
echo ""

# Esperar por Ctrl+C
trap "echo ''; echo 'Parando serviços...'; kill $BACKEND_PID $WEB_ATTENDANT_PID $WEB_PANEL_PID 2>/dev/null; exit 0" INT

wait
