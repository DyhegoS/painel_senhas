# Checklist de Inicial - Sistema de Painel de Senhas

## ✅ Setup Inicial

### 1. Pré-requisitos Instalados

- [ ] Node.js 18+ (https://nodejs.org)
- [ ] MongoDB 5+ ou Docker
- [ ] Git
- [ ] Editor de código (VS Code recomendado)

### 2. Clonar e Configurar

- [ ] Clonar repositório
- [ ] `npm install` na raiz
- [ ] Copiar `.env.example` para `.env`
- [ ] Configurar `MONGODB_URI` se necessário

### 3. Banco de Dados

- [ ] MongoDB rodando localmente ou Docker
- [ ] Executar `npm run seed` para dados iniciais
- [ ] Verificar em MongoDB Compass ou `mongosh`

## 🚀 Primeiro Teste

### 1. Backend

- [ ] `cd backend && npm run dev`
- [ ] Acessar http://localhost:5000/api/health
- [ ] Deve retornar `{"status":"OK","timestamp":"..."}`

### 2. Web Atendente

- [ ] Terminal novo: `cd web-attendant && npm start`
- [ ] Acessar http://localhost:3000
- [ ] Deve exibir interface de atendimento

### 3. Painel TV

- [ ] Terminal novo: `cd web-panel && npm start`
- [ ] Acessar http://localhost:3001
- [ ] Deve exibir painel com "Aguardando..."

### 4. Gerar Senhas (cURL)

```bash
# Listar serviços
curl http://localhost:5000/api/services

# Copiar um _id e gerar senha
curl -X POST http://localhost:5000/api/tickets/generate \
  -H "Content-Type: application/json" \
  -d '{"serviceTypeId":"COPIAR_ID_AQUI"}'

# Chamar próxima senha
curl -X POST http://localhost:5000/api/tickets/call \
  -H "Content-Type: application/json" \
  -d '{"attendantId":"attendant_001"}'
```

## 📚 Documentação

Depois de testar:

1. [ ] Ler [ARCHITECTURE.md](./ARCHITECTURE.md) - Entender arquitetura
2. [ ] Ler [API.md](./API.md) - Explorar endpoints
3. [ ] Ler [INSTALL.md](./INSTALL.md) - Instalação completa
4. [ ] Ler [ROADMAP.md](./ROADMAP.md) - Funcionalidades futuras

## 🔧 Development

### Estrutura de Pastas Criadas

```
✓ backend/
  ├─ src/
  │  ├─ models/           (ServiceType, Ticket)
  │  ├─ controllers/      (ticketController, serviceController)
  │  ├─ routes/           (ticketRoutes, serviceRoutes)
  │  └─ server.js
  ├─ seed.js             (Dados iniciais)
  └─ package.json

✓ mobile/
  ├─ App.js              (App React Native)
  ├─ src/screens/        (HomeScreen, TicketScreen)
  └─ package.json

✓ web-attendant/
  ├─ src/
  │  ├─ App.js
  │  ├─ App.css
  │  └─ index.js
  └─ package.json

✓ web-panel/
  ├─ src/
  │  ├─ App.js
  │  ├─ App.css
  │  └─ index.js
  └─ package.json

✓ Documentação
  ├─ README.md           (Overview)
  ├─ INSTALL.md          (Instalação detalhada)
  ├─ API.md              (Endpoints)
  ├─ ARCHITECTURE.md     (Arquitetura técnica)
  ├─ ROADMAP.md          (Desenvolvimento futuro)
  ├─ CONTRIBUTING.md     (Como contribuir)
  ├─ CHANGELOG.md        (Histórico)
  └─ LICENSE             (MIT)

✓ DevOps
  ├─ docker-compose.yml  (Containers)
  ├─ Dockerfile          (Backend)
  └─ .gitignore

✓ Config
  ├─ .env.example        (Variáveis)
  ├─ .editorconfig       (Consistência)
  ├─ .prettierrc          (Formatação)
  └─ package.json        (Raiz)
```

## 🧪 Próximos Passos de Desenvolvimento

### Curto Prazo

- [ ] Testar todas as funcionalidades do MVP
- [ ] Adicionar mais tipos de atendimento
- [ ] Customizar cores/logo
- [ ] Treinar equipe

### Médio Prazo

- [ ] Adicionar autenticação
- [ ] Implementar analytics
- [ ] Melhorar mobile UX
- [ ] Deploy em produção

### Longo Prazo

- [ ] Multi-unidades
- [ ] Relatórios avançados
- [ ] Integrações externas
- [ ] IA para previsões

## 📞 Troubleshooting

### Backend não conecta

```bash
# Verificar se MongoDB está rodando
mongosh painel_senhas

# Ou usar Docker
docker-compose up -d mongodb
```

### Porta 3000 já em uso

```bash
# Linux/Mac
lsof -i :3000
kill -9 <PID>

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### WebSocket não conecta

- Verificar se backend está rodando
- Abrir DevTools (F12) → Console
- Procurar erros de conexão

## ✨ Recursos Criados

- ✅ Sistema completo de gerenciamento de senhas
- ✅ 4 aplicações (backend, mobile, web attendant, painel TV)
- ✅ WebSocket para tempo real
- ✅ MongoDB para persistência
- ✅ Docker para containerização
- ✅ Documentação completa
- ✅ Scripts de inicialização
- ✅ Dados de teste
- ✅ Configuração de desenvolvimento

## 🎉 Você está pronto!

O sistema está completo e pronto para:

1. ✅ Desenvolvimento local
2. ✅ Teste e validação
3. ✅ Deploy em produção
4. ✅ Customização

Qualquer dúvida, consulte a documentação ou abra uma Issue!

---

**Data:** 2024-01-01
**Versão:** 1.0.0 MVP
