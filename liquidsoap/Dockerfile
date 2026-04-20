# ─── Liquidsoap 2.2.5 para arm64 (Ubuntu 22.04) ─────────────────────────────
# Compilado desde los repositorios oficiales de OCaml/OPAM.
# La imagen base debe ser arm64 compatible.
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# ── Dependencias del sistema ──────────────────────────────────────────────────
RUN apt-get update && apt-get install -y \
    curl wget gnupg2 ca-certificates \
    libssl-dev libcurl4-openssl-dev \
    libmp3lame-dev libvorbis-dev libopus-dev libflac-dev \
    libavcodec-dev libavformat-dev libavutil-dev libswresample-dev \
    ffmpeg \
    ocaml opam \
    pkg-config build-essential \
    && rm -rf /var/lib/apt/lists/*

# ── OPAM / Liquidsoap ─────────────────────────────────────────────────────────
# Usamos el repositorio binario de Liquidsoap cuando está disponible,
# y fallback a compilación con OPAM.
RUN opam init --disable-sandboxing -y \
    && eval $(opam env) \
    && opam update \
    && opam install -y \
        liquidsoap.2.2.5 \
        lame \
        vorbis \
        flac \
        opus \
        ffmpeg \
    && opam clean

# Asegurarnos de que liquidsoap queda en PATH
RUN eval $(opam env) && ln -sf $(which liquidsoap) /usr/local/bin/liquidsoap

# ── Directorio de trabajo ─────────────────────────────────────────────────────
WORKDIR /app

# Copiar el script de Liquidsoap
COPY radio.liq /app/radio.liq

# Volumen donde el backend monta los archivos de media
VOLUME ["/app/media"]

# ── Healthcheck ───────────────────────────────────────────────────────────────
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD pgrep -x liquidsoap || exit 1

# ── Entrypoint ────────────────────────────────────────────────────────────────
CMD ["liquidsoap", "/app/radio.liq"]
