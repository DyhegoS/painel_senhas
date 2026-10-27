#!/bin/bash
# Gera o APK do totem (Android) nesta máquina.
# Uso: ./scripts/build-apk.sh   (a partir da pasta mobile/)
#
# Requisitos (veja mobile/README.md):
#   JDK 17 e Android SDK; por padrão em ~/android-toolchain (JAVA_HOME/ANDROID_HOME sobrescrevem)
#
# A chave de assinatura é criada na primeira execução em ~/.painel-totem/.
# GUARDE UMA CÓPIA DELA: sem a mesma chave, um APK novo não instala por cima do antigo
# (seria preciso desinstalar o app em cada aparelho e configurá-lo de novo).
set -euo pipefail

cd "$(dirname "$0")/.."

TOOLCHAIN="${TOOLCHAIN:-$HOME/android-toolchain}"
export JAVA_HOME="${JAVA_HOME_17:-$TOOLCHAIN/jdk-17}"
export ANDROID_HOME="${ANDROID_HOME:-$TOOLCHAIN/sdk}"
export PATH="$JAVA_HOME/bin:$PATH"

if [ ! -x "$JAVA_HOME/bin/java" ] || [ ! -d "$ANDROID_HOME/platforms" ]; then
  echo "✗ JDK 17 ou Android SDK não encontrados em $TOOLCHAIN (veja mobile/README.md)"
  exit 1
fi

# --- Chave de assinatura (criada uma vez) ---
KEY_DIR="$HOME/.painel-totem"
KEYSTORE="$KEY_DIR/totem-release.jks"
KEY_PROPS="$KEY_DIR/keystore.properties"
KEY_ALIAS="totem"

if [ ! -f "$KEYSTORE" ]; then
  echo "🔑 Criando chave de assinatura em $KEYSTORE"
  mkdir -p "$KEY_DIR" && chmod 700 "$KEY_DIR"
  KEY_PASSWORD="$(openssl rand -hex 24)"
  keytool -genkeypair -v -keystore "$KEYSTORE" -alias "$KEY_ALIAS" \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "$KEY_PASSWORD" -keypass "$KEY_PASSWORD" \
    -dname "CN=Totem de Senhas, O=Painel de Senhas, C=BR" >/dev/null
  echo "password=$KEY_PASSWORD" > "$KEY_PROPS"
  chmod 600 "$KEYSTORE" "$KEY_PROPS"
  echo "⚠️  Faça backup da pasta $KEY_DIR (chave + senha)"
fi
KEY_PASSWORD="$(grep '^password=' "$KEY_PROPS" | cut -d= -f2-)"

# --- Projeto nativo gerado a partir do app.json (não versionado) ---
echo "🛠  Gerando projeto Android"
CI=1 npx expo prebuild --platform android --clean --no-install

# --- Build ---
echo "📦 Compilando APK (a primeira vez demora bastante)"
cd android
./gradlew assembleRelease \
  -Pandroid.injected.signing.store.file="$KEYSTORE" \
  -Pandroid.injected.signing.store.password="$KEY_PASSWORD" \
  -Pandroid.injected.signing.key.alias="$KEY_ALIAS" \
  -Pandroid.injected.signing.key.password="$KEY_PASSWORD"
cd ..

VERSION="$(node -p "require('./app.json').expo.version")"
mkdir -p dist
OUT="dist/totem-senhas-$VERSION.apk"
cp android/app/build/outputs/apk/release/app-release.apk "$OUT"
echo "✓ APK gerado: mobile/$OUT"
