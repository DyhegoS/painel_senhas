# 📋 Guia de Instalação - Sistema de Painel de Senhas

## ✅ Requisitos

- **Node.js** 18+ (https://nodejs.org)
- **MongoDB** 5+ (https://www.mongodb.com/try/download/community)
- **Git** (https://git-scm.com)
- **npm** ou **yarn**

## 🚀 Instalação Rápida

### 1️⃣ Clonar o Projeto

```bash
cd c:\Users\wksdyhego.s\Documents\projects\painel_senhas
```

### 2️⃣ Configurar Backend

```bash
cd backend

# Copiar arquivo de configuração
copy .env.example .env

# Instalar dependências
npm install

# Iniciar servidor (em terminal separado)
npm run dev
```

O backend estará disponível em: **http://localhost:5000**

### 3️⃣ Configurar Web Atendente

```bash
cd web-attendant

# Instalar dependências
npm install

# Iniciar aplicação (em terminal separado)
npm start
```

Acessar em: **http://localhost:3000**

### 4️⃣ Configurar Painel TV

```bash
cd web-panel

# Instalar dependências
npm install

# Iniciar aplicação (em terminal separado)
npm start
```

Acessar em: **http://localhost:3000** (será em outra porta automaticamente)

### 5️⃣ App Mobile

```bash
cd mobile

npm install

# Para Android
npm run android

# Para iOS (apenas Mac)
npm run ios

# Para Web
npm run web
```

---

## 🐳 Usando Docker

Se preferir usar Docker:

```bash
# Iniciar todos os serviços
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar serviços
docker-compose down
```

---

## 🗄️ Banco de Dados

### Inicializar MongoDB com dados padrão

```bash
# Opção 1: MongoDB local
mongosh painel_senhas

# Opção 2: MongoDB Atlas (nuvem)
# Alterar MONGODB_URI no .env para sua connection string
```

### Inserir tipos de atendimento padrão

```javascript
use painel_senhas

db.servicetypes.insertMany([
  { name: "Exame", prefix: "A", description: "Coleta de sangue e exames", active: true },
  { name: "Consulta", prefix: "B", description: "Consulta médica geral", active: true },
  { name: "Vacinação", prefix: "C", description: "Aplicação de vacinas", active: true },
  { name: "Curativos", prefix: "D", description: "Curativos e feridas", active: true },
  { name: "Recepção", prefix: "E", description: "Atendimento de recepção", active: true }
])
```

---

## 🧪 Testando o Sistema

### 1. Painel TV Vazio

Acesse: **http://localhost:3000** (Painel)

Você verá o painel aguardando...

### 2. Web Atendente Sem Fila

Acesse: **http://localhost:3000** (Web Attendant - porta diferente)

Botão "Chamar Próximo" está disponível

### 3. Gerar Senhas (Mobile/Web)

```bash
# Via cURL
curl -X POST http://localhost:5000/api/tickets/generate \
  -H "Content-Type: application/json" \
  -d '{"serviceTypeId": "SEU_ID_AQUI"}'

# Primeiro, obter um ID válido
curl http://localhost:5000/api/services
```

### 4. Chamar Próxima Senha

```bash
curl -X POST http://localhost:5000/api/tickets/call \
  -H "Content-Type: application/json" \
  -d '{"attendantId": "attendant_001"}'
```

---

## 📱 Estrutura do Projeto

```
painel_senhas/
├── backend/                 # API Node.js + Express
│   ├── src/
│   │   ├── models/         # Modelos MongoDB
│   │   ├── controllers/    # Lógica de negócio
│   │   ├── routes/         # Endpoints da API
│   │   └── server.js       # Entrada da aplicação
│   ├── package.json
│   └── .env
├── mobile/                  # App React Native
│   ├── src/
│   │   └── screens/        # Telas do app
│   ├── App.js
│   └── package.json
├── web-attendant/          # Web para Atendentes
│   ├── src/
│   │   ├── App.js
│   │   └── App.css
│   └── package.json
├── web-panel/              # Painel TV
│   ├── src/
│   │   ├── App.js
│   │   └── App.css
│   └── package.json
├── docker-compose.yml      # Configuração Docker
├── README.md
├── API.md                  # Documentação da API
└── INSTALL.md             # Este arquivo
```

---

## 🔧 Variáveis de Ambiente

### Backend (.env)

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/painel_senhas
NODE_ENV=development
SOCKET_IO_PORT=5000
```

### Usando MongoDB Atlas

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/painel_senhas
```

---

## 🐛 Troubleshooting

### Erro: "Cannot find module 'express'"

```bash
cd backend
npm install
```

### Erro: "MongoDB connection failed"

Verificar se MongoDB está rodando:

- Windows: `mongod` no Command Prompt
- Mac: `brew services start mongodb-community`
- Linux: `sudo systemctl start mongod`

### Porta já está em uso

```bash
# Liberar porta (Windows)
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Liberar porta (Mac/Linux)
lsof -i :5000
kill -9 <PID>
```

### WebSocket não conectando

Verificar CORS no backend - editar `backend/src/server.js`:

```javascript
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});
```

---

## 📚 Documentação Adicional

- [API Endpoints](./API.md)
- [README Principal](./README.md)

---

## 💡 Dicas de Desenvolvimento

### Modo Debug

```bash
# Backend com nodemon (auto-restart)
npm run dev

# Frontend com hot reload
npm start
```

### Verificar Saúde da API

```bash
curl http://localhost:5000/api/health
```

### Ver Estrutura de Dados

```bash
# MongoDB
use painel_senhas
db.tickets.find()
db.servicetypes.find()
```

---

## 📞 Suporte

Em caso de dúvidas:

1. Verifique a [documentação da API](./API.md)
2. Confira logs do terminal
3. Verifique as configurações do .env

Bom desenvolvimento! 🎉
