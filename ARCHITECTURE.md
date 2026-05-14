# 🏗️ Arquitetura do Sistema

## 📐 Visão Geral

O sistema de Painel de Senhas é uma aplicação de gerenciamento de filas com comunicação em tempo real via WebSocket.

```
┌─────────────────┐
│   APP MOBILE    │ (React Native)
│  Gera Senhas    │
└────────┬────────┘
         │ HTTP/REST
         │
┌────────▼─────────────────────┐
│      BACKEND (Node.js)        │
│  ├─ Express Server            │
│  ├─ MongoDB (Database)        │
│  └─ Socket.IO (Real-time)     │
└────┬──────────────┬───────────┘
     │              │ WebSocket
     │              │
     ▼              ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│     WEB      │  │   PAINEL     │  │   CLIENTE    │
│  ATENDENTE   │  │      TV      │  │   (Mobile)   │
│   (React)    │  │   (React)    │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
```

## 🔄 Fluxo de Dados

### 1. Cliente gera uma senha (Mobile)

```
Cliente (Mobile)
    ↓
POST /api/tickets/generate
    ↓
Backend valida serviço
    ↓
Cria documento no MongoDB
    ↓
Emite evento via WebSocket
    ↓
Retorna número da senha (ex: A-001)
```

### 2. Atendente chama a próxima senha (Web)

```
Atendente (Web)
    ↓
Click em "Chamar Próximo"
    ↓
POST /api/tickets/call
    ↓
Backend busca senha waiting
    ↓
Atualiza status para "called"
    ↓
Emite evento ticket_called via WebSocket
    ↓
Painel TV recebe e exibe a senha
    ↓
Cliente recebe atualização em tempo real
```

### 3. Painel TV em tempo real

```
WebSocket Connection
    ↓
Recebe eventos: ticket_called, queue_update
    ↓
Atualiza UI instantaneamente
    ↓
Mostra senha sendo chamada em destaque
```

## 📦 Estrutura de Dados

### Modelo: ServiceType (Tipo de Atendimento)

```javascript
{
  _id: ObjectId,
  name: String,              // "Exame", "Consulta", etc
  prefix: String,            // "A", "B", "C" (para gerar A-001, B-001)
  description: String,       // Descrição do serviço
  active: Boolean,           // Se está ativo
  createdAt: Date
}
```

### Modelo: Ticket (Senha)

```javascript
{
  _id: ObjectId,
  number: String,            // "A-001", "A-002", etc
  serviceType: ObjectId,     // Referência para ServiceType
  status: String,            // "waiting", "called", "attended", "cancelled"
  calledAt: Date,           // Quando foi chamada
  attendedAt: Date,         // Quando foi finalizada
  attendant: String,        // ID do atendente
  position: Number,         // Posição na fila
  createdAt: Date
}
```

## 🛠️ Componentes

### Backend (Node.js + Express)

**Responsabilidades:**

- Gerenciar tipos de atendimento
- Gerar senhas sequenciais
- Manter fila de espera
- Controlar status das senhas
- Transmitir atualizações via WebSocket

**Estrutura:**

```
backend/
├── src/
│   ├── models/
│   │   ├── ServiceType.js   # Schema MongoDB
│   │   └── Ticket.js        # Schema MongoDB
│   ├── controllers/
│   │   ├── ticketController.js   # Lógica de senhas
│   │   └── serviceController.js  # Lógica de serviços
│   ├── routes/
│   │   ├── ticketRoutes.js   # Endpoints de senhas
│   │   └── serviceRoutes.js  # Endpoints de serviços
│   └── server.js            # Entrada + WebSocket
├── seed.js                  # Popular DB com dados
├── package.json
└── .env
```

### App Mobile (React Native)

**Telas:**

1. **HomeScreen**: Lista tipos de atendimento
2. **TicketScreen**: Exibe a senha gerada + posição na fila

**Funcionalidades:**

- Seleção de tipo de atendimento
- Geração de senha
- Visualização de status em tempo real
- Conexão WebSocket para updates

### Web Atendente (React)

**Componentes:**

- **Seção atual**: Mostra a senha sendo atendida
- **Botão "Chamar Próximo"**: Chama próxima senha
- **Fila**: Lista de senhas esperando
- **Histórico**: Senhas já atendidas

**Funcionalidades:**

- Chamar próxima senha
- Finalizar atendimento
- Visualizar fila em tempo real

### Painel TV (React)

**Exibição:**

- **Seção principal**: Grande exibição da senha sendo chamada
- **Próximas**: Próximas 5 senhas da fila
- **Histórico**: Últimas senhas chamadas

**Recursos:**

- Design otimizado para telas grandes
- Cores vibrantes e texto legível
- Atualização em tempo real
- Sem interação (apenas exibição)

## 🔌 WebSocket Events

### Cliente para Servidor

```javascript
// Cliente se identifica
socket.emit('identify', { type: 'attendant|panel|customer' });

// Eventos de negócio
socket.emit('ticket_called', ticket);
socket.emit('queue_updated', queue);
socket.emit('ticket_finished', ticket);
```

### Servidor para Cliente

```javascript
// Broadcast de eventos
socket.on('ticket_called', handleTicketCalled);
socket.on('queue_update', handleQueueUpdate);
socket.on('ticket_finished', handleFinished);
```

## 🗄️ Banco de Dados

**Banco:** MongoDB
**Coleções:**

- `servicetypes`: Tipos de atendimento
- `tickets`: Senhas geradas

**Índices (recomendado):**

```javascript
// Tickets
db.tickets.createIndex({ serviceType: 1, status: 1 });
db.tickets.createIndex({ createdAt: -1 });

// ServiceTypes
db.servicetypes.createIndex({ prefix: 1 });
```

## 🔐 Segurança

### Pontos de Consideração

1. **Autenticação de Atendentes**
   - Implementar JWT token
   - Validar identidade antes de chamar senhas

2. **Autorização**
   - Apenas atendentes autenticados podem chamar senhas
   - Apenas administradores podem gerenciar serviços

3. **Dados Sensíveis**
   - Logs de auditoria
   - Rastreamento de quem chamou qual senha

### Implementação Futura

```javascript
// middleware/auth.js
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid token' });
  }
};
```

## 🚀 Performance

### Otimizações

1. **Caching**
   - Cache de tipos de atendimento
   - Cache de fila (atualizado via WebSocket)

2. **Paginação**
   - Histórico de senhas paginado
   - Evita carregar muitos documentos

3. **Índices**
   - Índice em `serviceType` e `status`
   - Índice em `createdAt` para ordenação

### Limites Recomendados

```javascript
// Fila máxima por serviço
const MAX_QUEUE_SIZE = 100;

// Histórico visível
const HISTORY_LIMIT = 20;

// Conexões WebSocket simultâneas
const MAX_CONNECTIONS = 1000;
```

## 📈 Escalabilidade

### Fase 1 (Atual)

- ✅ Servidor único
- ✅ MongoDB local
- ✅ WebSocket direto

### Fase 2 (Futuro)

- Múltiplos servidores com load balancer
- Redis para cache de fila
- MongoDB Atlas na nuvem
- Socket.IO com Redis adapter

```javascript
// socket.io-redis adapter (futuro)
const io = socketIO(server, {
  adapter: createAdapter(pubClient, subClient),
});
```

### Fase 3 (Enterprise)

- Kubernetes deployment
- Auto-scaling
- Monitoring e alertas
- Análise de dados

## 🧪 Testes

### Testes Sugeridos

```javascript
// Testes unitários
✓ generateTicket() gera número único
✓ callNextTicket() retorna oldest waiting
✓ finishTicket() atualiza status

// Testes de integração
✓ POST /tickets/generate cria no DB
✓ WebSocket emite events corretamente

// Testes E2E
✓ Cliente gera senha até final de atendimento
```

## 📊 Monitoramento

### Métricas Importantes

- Tempo médio de espera
- Taxa de abandono
- Pico de senhas por hora
- Conexões WebSocket ativas
- Performance da API

### Logs

```javascript
// Exemplo de log estruturado
{
  timestamp: "2024-01-01T10:00:00Z",
  event: "ticket_called",
  ticketId: "...",
  serviceType: "Exame",
  attendant: "attendant_001",
  waitTime: 300  // segundos
}
```

---

**Versão:** 1.0.0
**Última atualização:** 2024-01-01
