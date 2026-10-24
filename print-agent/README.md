# Agente de impressão (Raspberry Pi)

Roda no Raspberry Pi ligado por USB à impressora térmica Epson TM-T20X do totem.
Conecta ao backend via WebSocket e imprime cada senha gerada no tablet.

```
Tablet (app) ──POST /api/tickets/generate──▶ Backend ──WebSocket──▶ Raspberry Pi ──USB──▶ TM-T20X
```

## Instalação no Raspberry Pi

1. Instale o Node.js (18 ou superior):
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   ```
2. Copie esta pasta para `/home/pi/print-agent` e instale as dependências:
   ```bash
   cd /home/pi/print-agent && npm install
   ```
3. Confira se a impressora aparece e dê permissão ao usuário:
   ```bash
   ls -l /dev/usb/lp*        # deve listar /dev/usb/lp0
   sudo usermod -aG lp pi    # depois saia e entre de novo na sessão
   ```
   Se `/dev/usb/lp0` não aparecer, a TM-T20X pode estar em modo USB "Vendor Class".
   Troque para "Printer Class" no utilitário da Epson (TM-T20X Utility) ou pelas DIP switches.
4. Teste a impressão (não precisa do backend):
   ```bash
   npm run test-print
   ```
5. Instale como serviço para iniciar junto com o Raspberry Pi:
   ```bash
   sudo cp painel-print.service /etc/systemd/system/
   sudo systemctl enable --now painel-print
   journalctl -u painel-print -f   # acompanhar os logs
   ```

## Configuração (variáveis de ambiente)

| Variável         | Padrão                         | Descrição                         |
| ---------------- | ------------------------------ | --------------------------------- |
| `BACKEND_URL`    | _(obrigatório)_                | Endereço do backend, ex.: `http://192.168.0.10:5000` |
| `PRINTER_DEVICE` | `/dev/usb/lp0`                 | Dispositivo da impressora         |
| `PRINT_HEADER`   | `PAINEL DE SENHAS`             | Título no topo do papel           |
| `PRINT_FOOTER`   | `Aguarde ser chamado no painel`| Mensagem no rodapé                |
| `PRINT_AGENT_TOKEN` | _(vazio)_                    | Igual ao `PRINT_AGENT_TOKEN` do backend; sem ele o backend recusa a impressora quando o token está configurado |

Para alterar, edite as linhas `Environment=` em `/etc/systemd/system/painel-print.service`
e rode `sudo systemctl daemon-reload && sudo systemctl restart painel-print`.
