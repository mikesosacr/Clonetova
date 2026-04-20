"""
liquidsoap_manager.py
Gestiona contenedores Liquidsoap dinámicamente via Docker SDK.
Un contenedor por stream, creado en START y destruido en STOP.
"""

import docker
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Nombre de la red Docker donde corren los servicios de Clonetova
DOCKER_NETWORK = "clonetova_default"

# Imagen compilada de Liquidsoap (se construye junto con docker-compose)
LIQUIDSOAP_IMAGE = "clonetova-liquidsoap"

# Volumen compartido con los archivos de audio subidos
MEDIA_VOLUME = "clonetova_media_data"

# JWT permanente para que Liquidsoap llame al backend
API_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbkBjbG9uZXRvdmEubG9jYWwiLCJleHAiOjE4OTM0NTYwMDB9.4PCEwybKjWzjJvZqEPjk3aT9N6RgaZDrh9jNi6BCG9k"


def _get_client() -> docker.DockerClient:
    """Retorna un cliente Docker conectado al socket local."""
    return docker.from_env()


def _container_name(stream_id: str) -> str:
    return f"liquidsoap-{stream_id}"


def start_liquidsoap(
    stream_id: str,
    mount_point: str,
    icecast_password: str = "fuente123",
    icecast_host: str = "centovacast-icecast",
    icecast_port: int = 8000,
    backend_url: str = "http://centovacast-backend:8001",
) -> dict:
    """
    Crea y arranca un contenedor Liquidsoap para el stream indicado.
    Si ya existe un contenedor previo (de un crash anterior), lo elimina primero.

    Returns:
        dict con 'container_id' y 'name' del contenedor creado.
    Raises:
        Exception si Docker no puede crear el contenedor.
    """
    client = _get_client()
    name = _container_name(stream_id)

    # Limpiar contenedor zombie si existe
    _force_remove(client, name)

    logger.info(f"[LiquidSOAP] Creando contenedor {name} para stream {stream_id}")

    container = client.containers.run(
        image=LIQUIDSOAP_IMAGE,
        name=name,
        detach=True,
        restart_policy={"Name": "unless-stopped"},
        network=DOCKER_NETWORK,
        volumes={
            MEDIA_VOLUME: {"bind": "/app/media", "mode": "ro"},
        },
        environment={
            "BACKEND_URL": backend_url,
            "ICECAST_HOST": icecast_host,
            "ICECAST_PORT": str(icecast_port),
            "ICECAST_PASSWORD": icecast_password,
            "MOUNT_POINT": mount_point,
            "STREAM_ID": stream_id,
            "API_TOKEN": API_TOKEN,
        },
    )

    logger.info(f"[LiquidSOAP] Contenedor {name} iniciado: {container.short_id}")
    return {"container_id": container.id, "name": name}


def stop_liquidsoap(stream_id: str) -> bool:
    """
    Para y elimina el contenedor Liquidsoap del stream indicado.

    Returns:
        True si se eliminó, False si no existía.
    """
    client = _get_client()
    name = _container_name(stream_id)
    return _force_remove(client, name)


def get_liquidsoap_status(stream_id: str) -> Optional[str]:
    """
    Retorna el status del contenedor: 'running', 'exited', 'restarting', etc.
    Retorna None si el contenedor no existe.
    """
    client = _get_client()
    name = _container_name(stream_id)
    try:
        container = client.containers.get(name)
        return container.status
    except docker.errors.NotFound:
        return None


def get_liquidsoap_logs(stream_id: str, tail: int = 50) -> str:
    """Retorna las últimas N líneas de log del contenedor."""
    client = _get_client()
    name = _container_name(stream_id)
    try:
        container = client.containers.get(name)
        return container.logs(tail=tail).decode("utf-8", errors="replace")
    except docker.errors.NotFound:
        return f"Contenedor {name} no encontrado."


# ─── helpers privados ────────────────────────────────────────────────────────

def _force_remove(client: docker.DockerClient, name: str) -> bool:
    """Para y elimina un contenedor por nombre, ignorando si no existe."""
    try:
        container = client.containers.get(name)
        logger.info(f"[LiquidSOAP] Eliminando contenedor existente: {name} ({container.status})")
        container.stop(timeout=5)
        container.remove(force=True)
        return True
    except docker.errors.NotFound:
        return False
    except Exception as e:
        logger.warning(f"[LiquidSOAP] Error eliminando {name}: {e}")
        return False
