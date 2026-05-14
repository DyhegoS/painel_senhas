# API Endpoints

## Base URL

`http://localhost:5000/api`

## Serviços (Services)

### GET /services

Obtém todos os tipos de atendimento disponíveis

```json
Response:
[
  {
    "_id": "...",
    "name": "Exame",
    "prefix": "A",
    "description": "Coleta de sangue e exames",
    "active": true
  }
]
```

### POST /services

Criar novo tipo de serviço

```json
Body:
{
  "name": "Novo Serviço",
  "prefix": "F",
  "description": "Descrição do serviço"
}
```

### PUT /services/:id

Atualizar tipo de serviço

### DELETE /services/:id

Deletar tipo de serviço

---

## Tickets (Senhas)

### POST /tickets/generate

Gerar nova senha

```json
Body:
{
  "serviceTypeId": "..."
}

Response:
{
  "_id": "...",
  "number": "A-001",
  "serviceType": "Exame",
  "status": "waiting",
  "position": 1,
  "createdAt": "2024-01-01T10:00:00Z"
}
```

### GET /tickets/queue

Obter fila de espera

```json
Response:
[
  {
    "_id": "...",
    "number": "A-001",
    "serviceType": "Exame",
    "status": "waiting",
    "position": 1
  }
]
```

### POST /tickets/call

Chamar próxima senha

```json
Body:
{
  "attendantId": "attendant_001"
}

Response:
{
  "_id": "...",
  "number": "A-001",
  "serviceType": "Exame",
  "status": "called",
  "attendant": "attendant_001"
}
```

### POST /tickets/:id/finish

Finalizar atendimento

```json
Response:
{
  "_id": "...",
  "number": "A-001",
  "status": "attended",
  "attendedAt": "2024-01-01T10:05:00Z"
}
```

### POST /tickets/:id/cancel

Cancelar senha

```json
Response:
{
  "_id": "...",
  "number": "A-001",
  "status": "cancelled"
}
```

---

## WebSocket Events

### Cliente se identifica

```javascript
socket.emit('identify', { type: 'attendant' | 'panel' | 'customer' });
```

### Senha chamada

```javascript
socket.on('ticket_called', (ticket) => {
  // ticket.number: "A-001"
  // ticket.serviceType: "Exame"
});
```

### Fila atualizada

```javascript
socket.on('queue_update', (queue) => {
  // array de senhas na fila
});
```

### Atendimento finalizado

```javascript
socket.on('ticket_finished', (ticket) => {
  // ticket já foi finalizado
});
```
