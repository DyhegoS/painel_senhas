# 📝 CHANGELOG

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [1.0.0] - 2024-01-01

### ✨ Adicionado

#### Backend

- Servidor Express com MongoDB
- WebSocket real-time com Socket.IO
- CRUD de tipos de atendimento (ServiceType)
- Geração automática de senhas sequenciais
- Controle de fila de espera
- Estados de ticket (waiting, called, attended, cancelled)
- Controllers para ticket e service
- Routes RESTful para API
- Seed script para popular banco com dados de teste
- Suporte a CORS
- Variáveis de ambiente com dotenv
- Health check endpoint

#### Mobile (React Native)

- App base com navegação
- Tela HomeScreen para seleção de serviço
- Tela TicketScreen para exibição da senha
- Integração com API backend
- WebSocket para atualizações em tempo real
- Estado em tempo real da senha (waiting/called/attended)
- Exibição de posição na fila

#### Web Atendente (React)

- Interface para gerenciamento de senhas
- Listagem de fila de espera
- Botão "Chamar Próximo"
- Botão "Finalizar Atendimento"
- Seção de atendimento atual
- Exibição de fila com posições
- Estilos responsivos
- Integração WebSocket

#### Painel TV (React)

- Exibição em tela cheia de senha atual
- Seção de próximas senhas (até 5)
- Histórico de últimas chamadas
- Design otimizado para grandes telas
- Cores vibrantes e legível
- Atualização em tempo real via WebSocket
- Layout responsivo

#### Documentação

- README.md com visão geral
- INSTALL.md com guia completo de instalação
- API.md com documentação de endpoints
- ARCHITECTURE.md com detalhes de arquitetura
- ROADMAP.md com plano de desenvolvimento
- CONTRIBUTING.md com guia de contribuição
- CHANGELOG.md (este arquivo)

#### DevOps

- docker-compose.yml para orquestração
- Dockerfile para backend
- .gitignore apropriado
- .env.example para variáveis

### 🔧 Configuração

- Node.js 18+ como requisito
- MongoDB 5+ como banco de dados
- npm como gerenciador de pacotes
- React 18 para web
- React Native para mobile
- Socket.IO para comunicação real-time

### 📦 Dependências

#### Backend

- express: 4.18.2
- mongoose: 7.5.0
- socket.io: 4.7.2
- dotenv: 16.3.1
- cors: 2.8.5
- uuid: 9.0.0

#### Frontend

- react: 18.2.0
- axios: 1.5.0
- socket.io-client: 4.7.2

---

## [1.1.0] - (Planejado)

### ✨ Adicionado

- Autenticação JWT
- Sistema de login para atendentes
- Roles e permissões
- Logs de auditoria
- Rate limiting

### 🔐 Segurança

- Validação de entrada
- Hash de senhas
- CORS refinado
- Proteção contra ataques comuns

---

## [1.2.0] - (Planejado)

### 📊 Analytics

- Dashboard com gráficos
- Relatórios de performance
- Análise de picos
- Exportação de dados

---

## 🔄 Como Atualizar

Para atualizar para uma nova versão:

```bash
git pull origin main
npm install
npm run seed  # Se houver mudanças de schema
```

---

## 🐛 Correções de Bugs Conhecidos

### v1.0.0

- WebSocket pode não se reconectar automaticamente em caso de perda de conexão
  - **Solução:** Usar exponential backoff no cliente
- Ordem de senhas pode estar incorreta em caso de geração simultânea
  - **Solução:** Usar transações no MongoDB

---

## 🚀 Como Contribuir

Veja [CONTRIBUTING.md](./CONTRIBUTING.md) para mais informações.

---

**Última atualização:** 2024-01-01
