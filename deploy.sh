#!/bin/bash
# deploy.sh — Despliega Liquidsoap dinámico en el VPS
# Ejecutar como root en /opt/Clonetova
# Uso: bash deploy.sh

set -e
cd /opt/Clonetova

echo "════════════════════════════════════════════"
echo " Clonetova — Deploy Liquidsoap Dinámico"
echo "════════════════════════════════════════════"

# ── 1. Crear estructura de directorios ────────────────────────────────────────
echo "[1/7] Creando directorio liquidsoap/..."
mkdir -p liquidsoap

# Copiar archivos (asume que ya están en el repo)
# Si los archivos vienen del repo, git pull los trae automáticamente.

# ── 2. Instalar docker Python SDK en el backend ───────────────────────────────
echo "[2/7] Verificando docker SDK en requirements.txt..."
if ! grep -q "^docker" backend/requirements.txt 2>/dev/null; then
    echo "docker>=7.0.0" >> backend/requirements.txt
    echo "  → Agregado docker SDK a requirements.txt"
else
    echo "  → Ya presente"
fi

# ── 3. Pull del código nuevo ──────────────────────────────────────────────────
echo "[3/7] Git pull..."
git pull origin main

# ── 4. Reconstruir imágenes ───────────────────────────────────────────────────
echo "[4/7] Construyendo imágenes Docker (puede tardar varios minutos)..."
docker compose build --no-cache liquidsoap-builder backend

echo "[5/7] Levantando servicios base..."
docker compose up -d mongodb icecast nginx frontend backend

# El liquidsoap-builder solo necesita existir como imagen
docker compose run --rm liquidsoap-builder 2>/dev/null || true

# ── 5. Reinsertar stream "osa radio" en MongoDB ───────────────────────────────
echo "[6/7] Verificando stream 'osa radio' en MongoDB..."
EXISTS=$(docker exec centovacast-mongodb mongosh centovacast --quiet --eval \
    'db.streams.countDocuments({id: "6ffc2648-12dc-4b4b-891c-351fcefe4659"})' 2>/dev/null || echo "0")

if [ "$EXISTS" = "0" ]; then
    echo "  → Insertando stream 'osa radio'..."
    docker exec centovacast-mongodb mongosh centovacast --eval '
db.streams.insertOne({
  id: "6ffc2648-12dc-4b4b-891c-351fcefe4659",
  name: "osa radio",
  port: 8000,
  mount_point: "/osaradio",
  format: "AAC",
  bitrate: 128,
  max_listeners: 50,
  password: "fuente123",
  status: "offline",
  current_listeners: 0,
  created_at: new Date(),
  updated_at: new Date()
})'
else
    echo "  → Stream ya existe"
fi

# ── 6. Verificar ─────────────────────────────────────────────────────────────
echo "[7/7] Estado de los contenedores:"
docker compose ps

echo ""
echo "════════════════════════════════════════════"
echo " ✅ Deploy completado"
echo ""
echo " Próximos pasos:"
echo "   1. Ir al panel → crear/seleccionar stream → START"
echo "   2. Verificar: docker ps | grep liquidsoap"
echo "   3. Ver logs:  docker logs liquidsoap-<stream_id>"
echo "   4. Escuchar:  http://141.148.179.210:8000/osaradio"
echo "════════════════════════════════════════════"
