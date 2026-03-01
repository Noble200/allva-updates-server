#!/bin/bash
# ============================================
# Allva System - Script de Publicacion
# ============================================
# Uso: ./publish.sh <version>
# Ejemplo: ./publish.sh 1.4.4
#
# Este script automatiza TODO el proceso:
#   1. Verifica que los archivos .nupkg existan
#   2. Sube los .nupkg al GitHub Release (full + delta si existe)
#   3. Hace git add, commit y push
#   4. Railway se despliega automaticamente
# ============================================

set -e

REPO="Noble200/allva-updates-server"
RELEASES_DIR="releases"

# Validar argumento
if [ -z "$1" ]; then
    echo "ERROR: Debes especificar la version"
    echo "Uso: ./publish.sh <version>"
    echo "Ejemplo: ./publish.sh 1.4.4"
    exit 1
fi

VERSION="$1"
TAG="v${VERSION}"
FULL_PKG="${RELEASES_DIR}/AllvaSystem-${VERSION}-full.nupkg"
DELTA_PKG="${RELEASES_DIR}/AllvaSystem-${VERSION}-delta.nupkg"

echo "=========================================="
echo "  Publicando AllvaSystem v${VERSION}"
echo "=========================================="

# --- Paso 1: Verificar archivos ---
echo ""
echo "[1/4] Verificando archivos..."

if [ ! -f "$FULL_PKG" ]; then
    echo "ERROR: No se encontro ${FULL_PKG}"
    echo "Asegurate de haber copiado los archivos de Velopack a la carpeta releases/"
    exit 1
fi

echo "  OK: ${FULL_PKG} ($(du -h "$FULL_PKG" | cut -f1))"

if [ -f "$DELTA_PKG" ]; then
    echo "  OK: ${DELTA_PKG} ($(du -h "$DELTA_PKG" | cut -f1))"
    HAS_DELTA=true
else
    echo "  INFO: No hay delta package (se usara solo el full)"
    HAS_DELTA=false
fi

# Verificar que los metadata existan
if [ ! -f "${RELEASES_DIR}/RELEASES" ]; then
    echo "ERROR: No se encontro ${RELEASES_DIR}/RELEASES"
    exit 1
fi

if [ ! -f "${RELEASES_DIR}/releases.win.json" ]; then
    echo "ERROR: No se encontro ${RELEASES_DIR}/releases.win.json"
    exit 1
fi

echo "  OK: RELEASES"
echo "  OK: releases.win.json"

# --- Paso 2: Limpiar deltas fantasma del JSON ---
echo ""
echo "[2/4] Verificando consistencia del metadata..."

if [ "$HAS_DELTA" = false ]; then
    # Si no hay delta, quitarlo del releases.win.json para evitar 404
    if grep -q "\"AllvaSystem-${VERSION}-delta.nupkg\"" "${RELEASES_DIR}/releases.win.json"; then
        echo "  Quitando delta fantasma de releases.win.json..."
        # Remove the delta entry (the JSON object for the delta)
        python3 -c "
import json, sys
with open('${RELEASES_DIR}/releases.win.json', 'r') as f:
    data = json.load(f)
data['Assets'] = [a for a in data['Assets'] if a['FileName'] != 'AllvaSystem-${VERSION}-delta.nupkg']
with open('${RELEASES_DIR}/releases.win.json', 'w') as f:
    json.dump(data, f)
" 2>/dev/null || python -c "
import json, sys
with open('${RELEASES_DIR}/releases.win.json', 'r') as f:
    data = json.load(f)
data['Assets'] = [a for a in data['Assets'] if a['FileName'] != 'AllvaSystem-${VERSION}-delta.nupkg']
with open('${RELEASES_DIR}/releases.win.json', 'w') as f:
    json.dump(data, f)
"
        echo "  OK: Delta fantasma eliminado"
    fi
fi

# --- Paso 3: Crear GitHub Release y subir archivos ---
echo ""
echo "[3/4] Creando GitHub Release ${TAG}..."

# Verificar si el release ya existe
if gh release view "$TAG" --repo "$REPO" > /dev/null 2>&1; then
    echo "  El release ${TAG} ya existe, subiendo archivos..."
    # Subir full
    gh release upload "$TAG" "$FULL_PKG" --repo "$REPO" --clobber
    echo "  OK: Full package subido"
    # Subir delta si existe
    if [ "$HAS_DELTA" = true ]; then
        gh release upload "$TAG" "$DELTA_PKG" --repo "$REPO" --clobber
        echo "  OK: Delta package subido"
    fi
else
    # Crear release nuevo con los archivos
    ASSETS="$FULL_PKG"
    if [ "$HAS_DELTA" = true ]; then
        ASSETS="$ASSETS $DELTA_PKG"
    fi
    gh release create "$TAG" $ASSETS --repo "$REPO" --title "$TAG" --notes "Release ${VERSION}"
    echo "  OK: Release ${TAG} creado"
fi

# --- Paso 4: Git commit y push ---
echo ""
echo "[4/4] Commit y push..."

git add releases/
git commit -m "V ${VERSION}" || echo "  (sin cambios nuevos para commit)"
git push

echo ""
echo "=========================================="
echo "  LISTO! v${VERSION} publicada"
echo "=========================================="
echo ""
echo "  GitHub Release: https://github.com/${REPO}/releases/tag/${TAG}"
echo "  Railway se desplegara automaticamente"
echo ""

# Verificacion rapida
echo "Verificando endpoints..."
sleep 3
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://allva-updates-server-production.up.railway.app/RELEASES" 2>/dev/null || echo "???")
echo "  RELEASES: HTTP ${STATUS}"
REDIRECT=$(curl -s -o /dev/null -w "%{http_code}" "https://allva-updates-server-production.up.railway.app/AllvaSystem-${VERSION}-full.nupkg" 2>/dev/null || echo "???")
echo "  Full nupkg redirect: HTTP ${REDIRECT}"
echo ""
echo "Done!"
