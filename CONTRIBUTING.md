# 🤝 Guia de Contribuição

Obrigado por querer contribuir com o Sistema de Painel de Senhas! Este documento descreve como colaborar.

## 📋 Código de Conduta

Esperamos que todos os contribuidores:

- Sejam respeitosos e inclusivos
- Aceitem críticas construtivas
- Foquem no que é melhor para a comunidade
- Mostrem empatia com outros membros

## 🚀 Como Começar

### 1. Fork o Repositório

```bash
git clone https://github.com/seu-usuario/painel_senhas.git
cd painel_senhas
```

### 2. Criar uma Branch

```bash
git checkout -b feature/sua-feature
# ou
git checkout -b bugfix/seu-bug
```

**Convenção de nomes:**

- `feature/`: Novas funcionalidades
- `bugfix/`: Correção de bugs
- `docs/`: Documentação
- `refactor/`: Refatoração
- `test/`: Testes

### 3. Fazer Alterações

Siga o código existente como referência.

### 4. Testar

```bash
# Backend
cd backend
npm test

# Frontend
cd web-attendant
npm test
```

### 5. Commit

```bash
git add .
git commit -m "feat: descrição clara da alteração"
```

**Convenção de commits:**

- `feat:` Nova funcionalidade
- `fix:` Correção de bug
- `docs:` Alterações de documentação
- `style:` Formatação, sem mudanças lógicas
- `refactor:` Refatoração de código
- `test:` Adição/alteração de testes

### 6. Push e Pull Request

```bash
git push origin feature/sua-feature
```

Abra um Pull Request descrevendo:

- O que foi alterado
- Por quê
- Como testar

## 📝 Padrões de Código

### JavaScript/Node.js

```javascript
// ✅ Bom
const calculateWaitTime = (tickets) => {
  return tickets.reduce((sum, t) => sum + t.waitTime, 0) / tickets.length;
};

// ❌ Evitar
const calc = (t) => t.reduce((s, x) => s + x.w, 0) / t.length;
```

### React

```javascript
// ✅ Bom
function TicketStatus({ ticket }) {
  const [status, setStatus] = useState(ticket.status);

  useEffect(() => {
    // fetch updated status
  }, [ticket.id]);

  return (
    <div className="ticket-status">
      <span>{status}</span>
    </div>
  );
}

// ❌ Evitar
function TS(props) {
  return <div>{props.t.s}</div>;
}
```

### Estrutura de Pastas

```
Quando adicionar nova funcionalidade, siga:
src/
├── components/     # Componentes reutilizáveis
├── pages/          # Páginas principais
├── hooks/          # Custom hooks
├── utils/          # Funções utilitárias
├── services/       # APIs e chamadas externas
└── styles/         # Estilos globais
```

## 🧪 Testes

Toda funcionalidade nova deve incluir testes:

```javascript
describe('generateTicket', () => {
  it('should generate ticket with correct number format', () => {
    const ticket = generateTicket('A');
    expect(ticket.number).toMatch(/^A-\d{3}$/);
  });

  it('should increment ticket number', () => {
    const ticket1 = generateTicket('A');
    const ticket2 = generateTicket('A');
    expect(parseInt(ticket2.number.split('-')[1])).toBe(parseInt(ticket1.number.split('-')[1]) + 1);
  });
});
```

**Cobertura de testes mínima:** 80%

## 📚 Documentação

Quando adicionar funcionalidade:

1. Documentar no [README](./README.md)
2. Adicionar exemplos de uso
3. Atualizar [API.md](./API.md) se necessário
4. Adicionar comentários de código complexo

Exemplo de comentário bom:

```javascript
// Calcula a posição na fila baseado em senhas waiting
// antes desta. Considera ordem de criação (FIFO)
const position = await Ticket.countDocuments({
  serviceType: this.serviceType,
  status: 'waiting',
  createdAt: { $lt: this.createdAt },
});
```

## 🐛 Reportar Bugs

### Antes de reportar

- Verifique se o bug já foi reportado
- Reproduza em ambiente limpo
- Colete logs relevantes

### Como reportar

1. Vá para "Issues"
2. Clique "New Issue"
3. Use o template de bug
4. Descreva:
   - Ambiente (OS, Node version, etc)
   - Passos para reproduzir
   - Comportamento esperado
   - Comportamento real
   - Screenshots/logs

## 💡 Sugerir Features

1. Vá para "Issues"
2. Clique "New Issue"
3. Use o template de feature
4. Descreva:
   - Problema que resolve
   - Solução proposta
   - Casos de uso
   - Exemplos

## 🔍 Processo de Review

Seu PR será revisado por:

1. ✅ Verificação de testes
2. ✅ Qualidade do código (linter)
3. ✅ Documentação
4. ✅ Performance
5. ✅ Segurança

**Tempo estimado:** 2-5 dias

## 📦 Publicar Release

1. Atualizar `version` em package.json
2. Atualizar [CHANGELOG.md](./CHANGELOG.md)
3. Criar tag: `git tag v1.2.3`
4. Push: `git push origin v1.2.3`

## 🛠️ Ferramentas

### Linting

```bash
# Backend
npm run lint

# Frontend
npm run lint --prefix web-attendant
```

### Formatação

```bash
npm run format
```

### Build

```bash
npm run build --prefix web-attendant
```

## ❓ Dúvidas?

- Abra uma issue com tag `question`
- Consulte a [documentação](./ARCHITECTURE.md)
- Verifique discussões existentes

---

**Obrigado por contribuir! 🎉**
