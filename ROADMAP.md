# 🚀 ROADMAP - Sistema de Painel de Senhas

## ✅ v1.0.0 - MVP (ATUAL)

### Backend

- [x] API REST com Express
- [x] MongoDB para persistência
- [x] WebSocket para comunicação real-time
- [x] Gerenciamento de tipos de atendimento
- [x] Geração de senhas sequenciais
- [x] Controle de fila
- [x] Status de senhas (waiting, called, attended, cancelled)

### Mobile

- [x] App React Native base
- [x] Seleção de tipo de atendimento
- [x] Geração de senha
- [x] Visualização de posição na fila
- [x] Atualização em tempo real

### Web Atendente

- [x] Interface para chamar senhas
- [x] Visualização de fila
- [x] Finalizar atendimento
- [x] Histórico recente

### Painel TV

- [x] Exibição de senha atual
- [x] Próximas senhas (fila)
- [x] Histórico de chamadas
- [x] Design responsivo

---

## 📋 v1.1.0 - SEGURANÇA E AUTENTICAÇÃO

### Backend

- [ ] Autenticação JWT para atendentes
- [ ] Login de funcionários
- [ ] Roles/Permissions (Admin, Atendente, Visualizador)
- [ ] Hash de senhas
- [ ] Rate limiting
- [ ] CORS refinado
- [ ] Validação de entrada (sanitização)
- [ ] Logs de auditoria

### Frontend

- [ ] Tela de login (Atendente)
- [ ] Gerenciamento de tokens
- [ ] Logout
- [ ] Proteção de rotas

### Database

- [ ] Modelo de Usuário
- [ ] Tabela de logs de auditoria

---

## 📊 v1.2.0 - ANALYTICS E RELATÓRIOS

### Backend

- [ ] Cálculo de tempo médio de espera
- [ ] Cálculo de tempo médio de atendimento
- [ ] Taxa de abandono
- [ ] Pico de horário
- [ ] Endpoint de relatórios

### Web Admin

- [ ] Dashboard com gráficos
- [ ] Relatório por período
- [ ] Análise por serviço
- [ ] Performance de atendentes
- [ ] Exportar para PDF/CSV

### Features

- [ ] Filtragem por data
- [ ] Filtragem por serviço
- [ ] Comparação de períodos

---

## 👥 v1.3.0 - GESTÃO DE RECURSOS HUMANOS

### Backend

- [ ] Modelo de Atendente
- [ ] Modelo de Guichê/Sala
- [ ] Atribuição de atendentes a guichês
- [ ] Status do atendente (online, offline, pausa)
- [ ] Histórico de atendimentos por pessoa

### Web Admin

- [ ] Tela de gerenciamento de atendentes
- [ ] Atribuição de turnos
- [ ] Performance individual
- [ ] Disponibilidade

### Features

- [ ] Chamar "próximo guichê livre"
- [ ] Priorização por atendente menos ocupado
- [ ] Pausa automática

---

## 🎯 v1.4.0 - PRIORIZAÇÃO AVANÇADA

### Backend

- [ ] Senioridade de cliente (VIP, regular, novo)
- [ ] Prioridade por tipo de atendimento
- [ ] Atendimento preferencial para idosos/gestantes
- [ ] Fila com múltiplas prioridades

### Mobile

- [ ] Marcar como VIP/Preferencial
- [ ] Dados de perfil do cliente
- [ ] Histórico de atendimentos

### Web Atendente

- [ ] Badge de prioridade visual
- [ ] Filtrar fila por prioridade

---

## 🔔 v1.5.0 - NOTIFICAÇÕES

### Backend

- [ ] Email para confirmar senha
- [ ] SMS com número da senha
- [ ] Push notification para mobile

### Mobile

- [ ] Notificação quando próxima na fila
- [ ] Notificação quando chamada
- [ ] Som/vibração

### Integrações

- [ ] Twilio (SMS)
- [ ] SendGrid (Email)
- [ ] Firebase Cloud Messaging

---

## 🏢 v2.0.0 - MULTI-UNIDADE

### Backend

- [ ] Suporte a múltiplas localizações
- [ ] Dados isolados por unidade
- [ ] Sincronização entre unidades

### Web Admin

- [ ] Dashboard centralizado
- [ ] Comparação entre unidades
- [ ] Gestão de múltiplas sedes

### Features

- [ ] Transferência de atendimentos entre unidades
- [ ] Relatório consolidado

---

## 💳 v2.1.0 - PAGAMENTOS (Futuro)

### Backend

- [ ] Modelo de Plano
- [ ] Modelo de Subscription
- [ ] Integração com Stripe/PayPal

### Web Admin

- [ ] Dashboard de faturamento
- [ ] Gerenciamento de planos
- [ ] Histórico de pagamentos

---

## 🎨 v2.2.0 - CUSTOMIZAÇÃO

### Backend

- [ ] Configurações por unidade (cores, logo, textos)
- [ ] Temas customizáveis

### Web

- [ ] Editor de temas (light/dark)
- [ ] Customização de cores
- [ ] Upload de logo

---

## 📱 v2.3.0 - APP AVANÇADO

### Mobile

- [ ] Histórico de senhas do cliente
- [ ] Tempo estimado de espera
- [ ] Chat com atendente
- [ ] Feedback de atendimento (rating)
- [ ] Map de localizações

### Backend

- [ ] Cálculo de ETA
- [ ] Sistema de feedback
- [ ] Chat realtime

---

## 🤖 v3.0.0 - IA E AUTOMAÇÃO

### Backend

- [ ] IA para prever tempo de espera
- [ ] Chatbot para dúvidas
- [ ] Recomendação de melhor horário

### Mobile

- [ ] Sugestão de horários com menos fila
- [ ] Chat com bot

---

## 🌍 INTEGRAÇÕES FUTURAS

- [ ] **HIS/ERP**: Integração com sistemas hospitalares
- [ ] **Calendário**: Google Calendar, Outlook
- [ ] **Vídeo**: Telemedicina para alguns atendimentos
- [ ] **QR Code**: Gerar QR code da senha
- [ ] **Redes Sociais**: Compartilhar informações

---

## 📌 PRIORIDADES

### Curto Prazo (Próximas 2-3 sprints)

1. ✅ MVP funcional
2. 🔜 Autenticação e segurança
3. 🔜 Dashboard simples

### Médio Prazo (1-2 meses)

1. Analytics e relatórios
2. Gestão de atendentes
3. Notificações

### Longo Prazo (3+ meses)

1. Multi-unidade
2. Pagamentos
3. IA/Automação

---

## 📝 NOTAS

- Cada versão deve incluir testes
- Compatibilidade com versões anteriores
- Documentação de mudanças
- Plano de migração de dados

---

**Última atualização:** 2024-01-01
**Próxima revisão:** 2024-02-01
