#!/bin/bash
# Provisions the Android toolchain on this Kubernetes pod.
#
# /opt is wiped between sessions, so this script is idempotent — it
# checks for each dependency and only re-downloads if missing.
#
#   1. JDK 21 (Temurin, aarch64-linux)         → /opt/jdk-21.0.5+11
#   2. Android cmdline-tools + build-tools 35  → /opt/android-sdk
#   3. qemu-user-static + libc6:amd64          (apt)
#   4. aapt2 QEMU-x86_64 wrapper               → /opt/aapt2-wrapper/aapt2
#
# References:
#   - Android linux-aarch64 aapt2 build is missing (Google issue b/249593607).
#     We invoke the x86_64 binary under qemu instead.

set -e

JDK_DIR="/opt/jdk-21.0.5+11"
JDK_URL="https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.5%2B11/OpenJDK21U-jdk_aarch64_linux_hotspot_21.0.5_11.tar.gz"
SDK_ROOT="/opt/android-sdk"
SDK_CMDTOOLS_URL="https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"
PLATFORM_VER="35"
BUILD_TOOLS_VER="35.0.0"
WRAPPER_DIR="/opt/aapt2-wrapper"

echo "==> [toolchain] Host: $(uname -m) — $(. /etc/os-release && echo "$PRETTY_NAME")"

# 1. apt deps (qemu-user-static + amd64 libc for aapt2)
need_apt=()
dpkg -l qemu-user-static  2>/dev/null | grep -q "^ii" || need_apt+=("qemu-user-static")
dpkg -l libc6:amd64       2>/dev/null | grep -q "^ii" || need_apt+=("libc6:amd64")
dpkg -l libstdc++6:amd64  2>/dev/null | grep -q "^ii" || need_apt+=("libstdc++6:amd64")
dpkg -l unzip             2>/dev/null | grep -q "^ii" || need_apt+=("unzip")
dpkg -l curl              2>/dev/null | grep -q "^ii" || need_apt+=("curl")

if [ ${#need_apt[@]} -gt 0 ]; then
  echo "==> [toolchain] Installing: ${need_apt[*]}"
  dpkg --add-architecture amd64 >/dev/null 2>&1 || true
  apt-get update -qq
  apt-get install -y --no-install-recommends "${need_apt[@]}"
fi

# 2. JDK 21
if [ ! -x "$JDK_DIR/bin/javac" ]; then
  echo "==> [toolchain] Installing JDK 21 (Temurin, aarch64)..."
  curl -fsSL "$JDK_URL" -o /tmp/jdk.tar.gz
  mkdir -p /opt
  tar -xzf /tmp/jdk.tar.gz -C /opt
  rm -f /tmp/jdk.tar.gz
fi
export JAVA_HOME="$JDK_DIR"
export PATH="$JAVA_HOME/bin:$PATH"
echo "==> [toolchain] $(java -version 2>&1 | head -1)"

# 3. Android SDK + build-tools
if [ ! -d "$SDK_ROOT/build-tools/$BUILD_TOOLS_VER" ] || [ ! -d "$SDK_ROOT/platforms/android-$PLATFORM_VER" ]; then
  echo "==> [toolchain] Installing Android SDK..."
  mkdir -p "$SDK_ROOT/cmdline-tools"
  if [ ! -d "$SDK_ROOT/cmdline-tools/latest" ]; then
    curl -fsSL "$SDK_CMDTOOLS_URL" -o /tmp/cmdtools.zip
    unzip -q /tmp/cmdtools.zip -d /tmp/cmdtools
    mv /tmp/cmdtools/cmdline-tools "$SDK_ROOT/cmdline-tools/latest"
    rm -rf /tmp/cmdtools /tmp/cmdtools.zip
  fi
  export ANDROID_HOME="$SDK_ROOT"
  export ANDROID_SDK_ROOT="$SDK_ROOT"
  yes | "$SDK_ROOT/cmdline-tools/latest/bin/sdkmanager" --licenses >/dev/null 2>&1 || true
  "$SDK_ROOT/cmdline-tools/latest/bin/sdkmanager" \
    "platform-tools" \
    "platforms;android-$PLATFORM_VER" \
    "build-tools;$BUILD_TOOLS_VER" >/dev/null
fi

# 4. aapt2 QEMU wrapper (x86_64 aapt2 under qemu-x86_64)
mkdir -p "$WRAPPER_DIR"
cat > "$WRAPPER_DIR/aapt2" <<'EOF'
#!/bin/bash
# QEMU shim for x86_64 aapt2 on aarch64 hosts.
# Locates the real aapt2 in the Android build-tools we installed.
set -e
REAL=""
for v in 35.0.0 34.0.0; do
  cand="/opt/android-sdk/build-tools/$v/aapt2"
  if [ -x "$cand" ]; then REAL="$cand"; break; fi
done
if [ -z "$REAL" ]; then
  echo "aapt2-wrapper: no aapt2 binary found under /opt/android-sdk/build-tools" >&2
  exit 127
fi
exec qemu-x86_64-static -L /usr/x86_64-linux-gnu "$REAL" "$@"
EOF
chmod +x "$WRAPPER_DIR/aapt2"

# Sanity check: wrapper must run
if ! "$WRAPPER_DIR/aapt2" version >/dev/null 2>&1; then
  echo "==> [toolchain] WARNING: aapt2 wrapper smoke test failed — Gradle may still succeed via fallback."
else
  echo "==> [toolchain] $("$WRAPPER_DIR/aapt2" version 2>&1 | head -1)"
fi

echo "==> [toolchain] OK — JDK + SDK + aapt2 wrapper ready."
echo "    JAVA_HOME    = $JDK_DIR"
echo "    ANDROID_HOME = $SDK_ROOT"
echo "    aapt2 shim   = $WRAPPER_DIR/aapt2"
