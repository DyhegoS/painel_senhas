# Totem de Senhas (Android)

App que roda em celulares e tablets Android na recepção. O paciente toca no tipo de
atendimento, a senha é gerada (e impressa, se houver impressora) e o totem volta sozinho para a
tela inicial.

Funciona com Android 5.0 ou mais novo, na vertical ou na horizontal.

## Instalar num aparelho

1. Copie `totem-senhas-<versão>.apk` para o aparelho (cabo USB, pendrive, Google Drive, WhatsApp…).
2. Abra o arquivo no aparelho. O Android vai pedir para **permitir instalar apps desta fonte**:
   permita e instale.

   Com cabo USB e depuração USB ativada, também dá para instalar daqui:
   `~/android-toolchain/sdk/platform-tools/adb install -r dist/totem-senhas-<versão>.apk`
3. Abra o **Totem de Senhas**. Na primeira vez, a tela de ajustes aparece sozinha:
   - **Endereço do servidor**: o IP do servidor Ubuntu (ex.: `192.168.0.10`)
   - **Token do totem**: o `TOTEM_TOKEN` do `deploy/.env` (vazio se não usar)
   - **PIN dos ajustes**: escolha um PIN de 4 a 8 números
   - Toque em **Testar conexão** e depois em **Salvar**.

O aparelho precisa estar na mesma rede Wi-Fi do servidor.

## Usar como totem

- **Abrir os ajustes depois:** segure o título azul "Escolha o atendimento" por 3 segundos e
  digite o PIN.
- **Tela:** fica sempre ligada enquanto o app está aberto. As barras do Android ficam escondidas
  (deslizar da borda mostra de novo por alguns segundos).
- **Servidor fora do ar:** o totem mostra um aviso e tenta reconectar sozinho a cada 10 segundos.
- **Prender o aparelho no app:** use a **fixação de tela** do Android. Assim o paciente não
  consegue sair do totem.
  1. Ajustes do Android → Segurança (ou "Segurança e privacidade" → "Mais configurações") →
     **Fixar app** (ou "Fixação de tela") → ativar, de preferência com "pedir PIN para soltar".
  2. Abra o totem, toque no botão de apps recentes, toque no ícone do Totem de Senhas →
     **Fixar**.
  3. Para soltar: segure Voltar + Apps recentes (e digite o PIN/senha do aparelho).

  Depois de reiniciar o aparelho, é preciso abrir e fixar o app de novo.
- Deixe o aparelho **ligado na tomada** e, se possível, desative a atualização automática do
  sistema nas horas de atendimento.

## Gerar o APK

O APK é gerado nesta máquina (Linux/WSL) com `./scripts/build-apk.sh`, que fica em `mobile/`.

### Preparar a máquina (uma vez)

Precisa do JDK 17 e do Android SDK. O script procura os dois em `~/android-toolchain`:

```bash
T=~/android-toolchain; mkdir -p $T/sdk/cmdline-tools && cd $T
curl -fsSL -o jdk17.tar.gz "https://api.adoptium.net/v3/binary/latest/17/ga/linux/x64/jdk/hotspot/normal/eclipse"
mkdir -p jdk-17 && tar -xzf jdk17.tar.gz -C jdk-17 --strip-components=1 && rm jdk17.tar.gz
curl -fsSL -o cmdline.zip "https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"
unzip -q cmdline.zip -d sdk/cmdline-tools && mv sdk/cmdline-tools/cmdline-tools sdk/cmdline-tools/latest && rm cmdline.zip
export JAVA_HOME=$T/jdk-17 ANDROID_HOME=$T/sdk PATH=$T/jdk-17/bin:$T/sdk/cmdline-tools/latest/bin:$PATH
yes | sdkmanager --licenses
sdkmanager "platform-tools" "platforms;android-33" "build-tools;33.0.0" "ndk;23.1.7779620" "cmake;3.22.1"
```

São cerca de 3 GB. A máquina precisa de pelo menos 6 GB de RAM livres para o build.

### Gerar

```bash
cd mobile
npm install
npm run build:apk          # ou ./scripts/build-apk.sh
```

O APK sai em `mobile/dist/totem-senhas-<versão>.apk`. O primeiro build leva de 10 a 20 minutos;
os seguintes são bem mais rápidos.

### Chave de assinatura: faça backup!

Na primeira execução o script cria a chave em `~/.painel-totem/` (`totem-release.jks` e
`keystore.properties`, com a senha). **Guarde uma cópia dessa pasta fora desta máquina.**

Um APK novo só instala por cima do antigo se for assinado com a mesma chave. Sem ela, é preciso
desinstalar o app em cada aparelho (perdendo os ajustes) antes de instalar a versão nova.

### Nova versão

1. Em `app.json`, aumente `expo.version` (ex.: `1.0.1`) e `expo.android.versionCode` (ex.: `2`).
2. Rode `npm run build:apk` e instale o APK novo por cima do antigo. Os ajustes são mantidos.

### Desenvolvimento

`npm start` abre o Expo. Dá para testar no navegador (`w`) ou no app Expo Go. A pasta
`android/` é gerada pelo build a partir do `app.json` e não vai para o git: mudanças nativas
(nome, ícone, permissões) devem ser feitas no `app.json`.
