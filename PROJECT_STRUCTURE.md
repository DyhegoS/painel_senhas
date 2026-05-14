# 📋 Estrutura do Projeto - Sistema de Painel de Senhas

## 📁 Hierarquia Completa

```
painel_senhas/
│
├─ 📂 backend/                      # Node.js + Express + MongoDB
│  ├─ src/
│  │  ├─ 📂 models/
│  │  │  ├─ ServiceType.js          # Schema: tipos de atendimento
│  │  │  └─ Ticket.js               # Schema: senhas geradas
│  │  │
│  │  ├─ 📂 controllers/
│  │  │  ├─ ticketController.js     # Lógica de senhas
│  │  │  └─ serviceController.js    # Lógica de serviços
│  │  │
│  │  ├─ 📂 routes/
│  │  │  ├─ ticketRoutes.js         # Endpoints /tickets
│  │  │  └─ serviceRoutes.js        # Endpoints /services
│  │  │
│  │  └─ server.js                  # Servidor Express + WebSocket
│  │
│  ├─ 📂 __tests__/
│  │  └─ controllers.test.js         # Testes unitários
│  │
│  ├─ seed.js                       # Seed do banco com dados iniciais
│  ├─ Dockerfile                    # Imagem Docker
│  ├─ package.json                  # Dependências
│  └─ .env.example                  # Variáveis de ambiente
│
├─ 📂 mobile/                        # React Native
│  ├─ 📂 src/
│  │  └─ 📂 screens/
│  │     ├─ HomeScreen.js           # Seleção de atendimento
│  │     └─ TicketScreen.js         # Exibição de senha
│  │
│  ├─ App.js                        # Entrada do app
│  └─ package.json                  # Dependências
│
├─ 📂 web-attendant/                # React (Atendentes)
│  ├─ 📂 src/
│  │  ├─ App.js                     # Componente principal
│  │  ├─ App.css                    # Estilos
│  │  └─ index.js                   # Entry point
│  │
│  ├─ 📂 public/
│  │  └─ index.html                 # HTML principal
│  │
│  └─ package.json                  # Dependências
│
├─ 📂 web-panel/                    # React (Painel TV)
│  ├─ 📂 src/
│  │  ├─ App.js                     # Componente principal
│  │  ├─ App.css                    # Estilos
│  │  └─ index.js                   # Entry point
│  │
│  ├─ 📂 public/
│  │  └─ index.html                 # HTML principal
│  │
│  └─ package.json                  # Dependências
│
├─ 📄 README.md                     # Overview do projeto
├─ 📄 INSTALL.md                    # Guia de instalação
├─ 📄 API.md                        # Documentação de endpoints
├─ 📄 ARCHITECTURE.md               # Detalhes da arquitetura
├─ 📄 ROADMAP.md                    # Plano de desenvolvimento
├─ 📄 CONTRIBUTING.md               # Guia de contribuição
├─ 📄 CHANGELOG.md                  # Histórico de mudanças
├─ 📄 CHECKLIST.md                  # Checklist inicial
├─ 📄 PROJECT_STRUCTURE.md          # Este arquivo
├─ 📄 LICENSE                       # Licença MIT
├─ 📄 package.json                  # Scripts da raiz
│
├─ ⚙️  .env.example                 # Exemplo de variáveis
├─ ⚙️  .editorconfig                # Configuração de editor
├─ ⚙️  .prettierrc                  # Formatação de código
├─ ⚙️  .gitignore                   # Arquivos a ignorar
│
├─ 🐳 docker-compose.yml            # Orquestração de containers
├─ 🐳 backend/Dockerfile            # Imagem do backend
│
├─ 🚀 start-dev.sh                  # Script de inicialização
└─ 📝 start.sh                      # Script alternativo

```

## 🔧 Componentes e Funcionalidades

### Backend API (`/backend`)

**Endpoints Disponíveis:**

```
GET  /api/health              # Health check
GET  /api/services            # Listar tipos de atendimento
POST /api/services            # Criar novo tipo
PUT  /api/services/:id        # Atualizar tipo
DELETE /api/services/:id      # Deletar tipo

POST /api/tickets/generate    # Gerar nova senha
GET  /api/tickets/queue       # Obter fila
POST /api/tickets/call        # Chamar próxima
POST /api/tickets/:id/finish  # Finalizar
POST /api/tickets/:id/cancel  # Cancelar
```

**Models:**

- `ServiceType`: Tipos de atendimento (Exame, Consulta, etc)
- `Ticket`: Senhas geradas com status

### Mobile App (`/mobile`)

**Telas:**

- `HomeScreen`: Lista e seleção de serviços
- `TicketScreen`: Exibição de senha e posição

**Funcionalidades:**

- Geração de senha
- Visualização de status real-time
- Sincronização via WebSocket

### Web Atendente (`/web-attendant`)

**Componentes:**

- Seção de atendimento atual
- Botão "Chamar Próximo"
- Lista de fila
- Botão "Finalizar"

**Estilos:**

- Layout moderno e responsivo
- Cores claras e legíveis
- Informações visíveis de primeira

### Painel TV (`/web-panel`)

**Layout:**

- Seção grande central: Senha sendo atendida
- Seção lateral: Próximas 5 senhas
- Seção lateral: Últimas chamadas

**Design:**

- Otimizado para grandes telas
- Cores vibrantes (amarelo, verde, vermelho)
- Texto grande e legível
- Sem interatividade (apenas visualização)

## 🗄️ Modelos de Dados

### ServiceType

```javascript
{
  _id: ObjectId,
  name: String,
  prefix: String,
  description: String,
  active: Boolean,
  createdAt: Date
}
```

### Ticket

```javascript
{
  _id: ObjectId,
  number: String,           // ex: A-001
  serviceType: ObjectId,    // ref ServiceType
  status: String,           // waiting, called, attended, cancelled
  position: Number,
  calledAt: Date,
  attendedAt: Date,
  attendant: String,
  createdAt: Date
}
```

## 🔌 Eventos WebSocket

```javascript
// Identificar cliente
socket.emit('identify', { type: 'attendant|panel|customer' });

// Eventos transmitidos
socket.on('ticket_called', handleCall);
socket.on('queue_update', handleQueue);
socket.on('ticket_finished', handleFinish);
```

## 📦 Dependências Principais

### Backend

- `express`: Framework web
- `mongoose`: ODM MongoDB
- `socket.io`: WebSocket real-time
- `cors`: CORS middleware
- `dotenv`: Variáveis ambiente

### Frontend

- `react`: UI framework
- `axios`: HTTP client
- `socket.io-client`: WebSocket client

## 🚀 Scripts Disponíveis

```bash
# Na raiz
npm run install:all           # Instalar tudo
npm run dev:backend           # Dev backend
npm run dev:web-attendant     # Dev web
npm run dev:web-panel         # Dev painel
npm run build:web-attendant   # Build web
npm run seed                  # Seed BD
npm run docker:up             # Docker
npm run docker:down           # Parar Docker

# Backend
cd backend
npm run dev                   # Desenvolvimento
npm start                     # Produção
npm test                      # Testes

# Frontend
cd web-attendant
npm start                     # Dev
npm run build                 # Build
```

## 🎯 Fluxo de Dados

```
1. Cliente (Mobile)
   ↓
   POST /api/tickets/generate
   ↓
2. Backend
   - Valida serviço
   - Gera número único
   - Calcula posição
   - Salva no MongoDB
   - Emite via WebSocket
   ↓
3. Painel TV + Cliente (Mobile)
   - Recebem atualização
   - Mostram posição
   ↓
4. Atendente (Web)
   - Click "Chamar Próximo"
   ↓
5. Backend
   - Busca ticket waiting
   - Atualiza status para called
   - Emite via WebSocket
   ↓
6. Painel TV + Cliente
   - Atualizam interface
   - Exibem senha sendo chamada
   ↓
7. Atendente
   - Click "Finalizar"
   ↓
8. Backend
   - Atualiza status para attended
   - Remove da fila ativa
   - Emite atualização
```

## 🔐 Segurança (v1.0)

⚠️ **Nota:** MVP não inclui autenticação completa

- ❌ Sem JWT
- ❌ Sem senhas de atendente
- ❌ Sem controle de acesso
- ❌ Sem rate limiting
- ❌ Sem logs de auditoria

✅ Ver [ROADMAP.md](./ROADMAP.md) para v1.1.0

## 📈 Performance

- WebSocket para atualizações em tempo real
- Índices no MongoDB
- Caching de tipos
- Conexões pooled

## 🧪 Testes

Arquivos de teste:

- `backend/src/__tests__/controllers.test.js`

Executar:

```bash
cd backend
npm test
```

## 📚 Documentação Interna

Cada arquivo importante tem comentários explicativos:

```javascript
// Exemplo do backend/src/controllers/ticketController.js

/**
 * Gera uma nova senha para um tipo de serviço
 * @param {String} serviceTypeId - ID do tipo de serviço
 * @returns {Object} Ticket gerado
 */
async function generateTicket(serviceTypeId) { ... }
```

## 🌐 URLs de Acesso

| Componente    | URL                   | Porta | Descrição           |
| ------------- | --------------------- | ----- | ------------------- |
| Backend       | http://localhost:5000 | 5000  | API + WebSocket     |
| Web Attendant | http://localhost:3000 | 3000  | Interface atendente |
| Web Panel     | http://localhost:3001 | 3001  | Painel TV           |
| MongoDB       | localhost             | 27017 | Banco de dados      |

## 🎨 Cores Utilizadas

| Cor      | Uso      | Hex     |
| -------- | -------- | ------- |
| Azul     | Primária | #0066cc |
| Verde    | Sucesso  | #28a745 |
| Laranja  | Atenção  | #ff6b00 |
| Vermelho | Erro     | #dc3545 |
| Amarelo  | Destaque | #ffd700 |
| Cinza    | Fundo    | #f5f5f5 |

## 📞 Convenções

### Nomes de Branches

- `feature/nome-feature` - Nova funcionalidade
- `bugfix/nome-bug` - Correção
- `docs/nome-doc` - Documentação
- `refactor/nome` - Refatoração

### Commits

- `feat: descrição` - Feature
- `fix: descrição` - Bug fix
- `docs: descrição` - Documentação
- `style: descrição` - Formatação
- `refactor: descrição` - Refatoração

### Nomes de Variáveis

- camelCase para JavaScript
- UPPER_CASE para constantes
- snake_case para MongoDB

## 🎓 Próximos Passos

1. ✅ Estrutura criada
2. 🔜 Implementar autenticação (v1.1)
3. 🔜 Adicionar analytics (v1.2)
4. 🔜 Multi-unidades (v2.0)

---

**Versão:** 1.0.0
**Última atualização:** 2024-01-01
