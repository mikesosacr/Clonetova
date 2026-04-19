"""
icecast_integration.py
======================
Módulo de integración con IceCast Admin API para Clonetova.

Coloca este archivo en: backend/icecast_integration.py
Luego actualiza server.py con los cambios indicados al final de este archivo.

Requisitos adicionales en requirements.txt:
    httpx>=0.27.0   (ya probablemente está)
    xmltodict>=0.13.0   ← AGREGAR

IceCast Admin API endpoints usados:
    GET  /admin/stats          → estadísticas globales y por mountpoint (XML)
    GET  /admin/listclients    → clientes conectados a un mountpoint
    GET  /admin/listmounts     → todos los mountpoints activos
    GET  /admin/metadata       → canción actual de un mountpoint
    POST /admin/killclient     → desconectar un cliente específico
    POST /admin/fallbacks      → configurar fallback de un mountpoint
"""

import httpx
import xmltodict
import logging
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime

logger = logging.getLogger(__name__)


class IceCastClient:
    """
    Cliente async para la IceCast Admin HTTP API.
    Se instancia una vez y se reutiliza en toda la app.
    """

    def __init__(self, host: str, port: int, admin_password: str, timeout: float = 8.0):
        self.host = host
        self.port = port
        self.admin_password = admin_password
        self.timeout = timeout
        self._base_url = f"http://{host}:{port}"
        self._auth = ("admin", admin_password)

    # ── Helpers internos ──────────────────────────────────────

    async def _get_xml(self, path: str, params: dict = None) -> Optional[Dict]:
        """Hace GET a IceCast, devuelve dict parseado del XML o None si falla."""
        url = f"{self._base_url}{path}"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                r = await client.get(url, auth=self._auth, params=params or {})
                r.raise_for_status()
                return xmltodict.parse(r.text)
        except httpx.ConnectError:
            logger.warning(f"IceCast no disponible en {self._base_url}")
            return None
        except httpx.HTTPStatusError as e:
            logger.warning(f"IceCast respondió {e.response.status_code} para {path}")
            return None
        except Exception as e:
            logger.error(f"Error consultando IceCast {path}: {e}")
            return None

    async def _get_raw(self, path: str, params: dict = None) -> Optional[str]:
        """Devuelve el texto crudo de una respuesta IceCast."""
        url = f"{self._base_url}{path}"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                r = await client.get(url, auth=self._auth, params=params or {})
                return r.text
        except Exception as e:
            logger.error(f"Error raw GET IceCast {path}: {e}")
            return None

    def _safe_int(self, value, default: int = 0) -> int:
        try:
            return int(value)
        except (TypeError, ValueError):
            return default

    # ── Estado del servidor ───────────────────────────────────

    async def is_alive(self) -> bool:
        """Verifica si IceCast está respondiendo."""
        data = await self._get_xml("/admin/stats")
        return data is not None

    async def get_server_stats(self) -> Dict[str, Any]:
        """
        Estadísticas globales del servidor IceCast.
        Devuelve listeners totales, bandwidth, version, etc.
        """
        data = await self._get_xml("/admin/stats")
        if not data:
            return {"online": False, "total_listeners": 0, "sources": 0}

        try:
            ic = data.get("icestats", {})
            return {
                "online": True,
                "admin": ic.get("admin", ""),
                "host": ic.get("host", ""),
                "location": ic.get("location", ""),
                "server_id": ic.get("server_id", ""),
                "server_start": ic.get("server_start", ""),
                "total_listeners": self._safe_int(ic.get("clients", 0)),
                "total_connections": self._safe_int(ic.get("connections", 0)),
                "sources": self._safe_int(ic.get("sources", 0)),
                "stats": self._safe_int(ic.get("stats", 0)),
                "listeners": self._safe_int(ic.get("listeners", 0)),
            }
        except Exception as e:
            logger.error(f"Error parseando stats de IceCast: {e}")
            return {"online": True, "total_listeners": 0, "sources": 0}

    # ── Mountpoints ───────────────────────────────────────────

    async def list_mounts(self) -> List[Dict[str, Any]]:
        """
        Lista todos los mountpoints activos en IceCast.
        Retorna lista de dicts con nombre, listeners, formato, etc.
        """
        data = await self._get_xml("/admin/listmounts")
        if not data:
            return []

        try:
            ic = data.get("icestats", {})
            sources = ic.get("source", [])
            # IceCast devuelve dict si hay 1, lista si hay varios
            if isinstance(sources, dict):
                sources = [sources]

            result = []
            for src in sources:
                result.append({
                    "mount": src.get("@mount", src.get("mount", "")),
                    "listeners": self._safe_int(src.get("listeners", 0)),
                    "format": src.get("server_type", "unknown"),
                    "bitrate": self._safe_int(src.get("bitrate", 0)),
                    "current_song": src.get("title", ""),
                    "artist": src.get("artist", ""),
                    "server_name": src.get("server_name", ""),
                    "peak_listeners": self._safe_int(src.get("listener_peak", 0)),
                    "connected_since": src.get("stream_start", ""),
                })
            return result
        except Exception as e:
            logger.error(f"Error parseando listmounts: {e}")
            return []

    async def get_mount_stats(self, mount_point: str) -> Optional[Dict[str, Any]]:
        """
        Estadísticas de un mountpoint específico.
        mount_point: ej. "/radio1" o "/stream"
        """
        # Asegurarse que empieza con /
        if not mount_point.startswith("/"):
            mount_point = "/" + mount_point

        data = await self._get_xml("/admin/stats")
        if not data:
            return None

        try:
            ic = data.get("icestats", {})
            sources = ic.get("source", [])
            if isinstance(sources, dict):
                sources = [sources]

            for src in sources:
                # El atributo mount puede ser @mount o mount según versión de IceCast
                src_mount = src.get("@mount", src.get("mount", ""))
                if src_mount == mount_point:
                    return {
                        "mount": src_mount,
                        "listeners": self._safe_int(src.get("listeners", 0)),
                        "peak_listeners": self._safe_int(src.get("listener_peak", 0)),
                        "bitrate": self._safe_int(src.get("bitrate", 0)),
                        "format": src.get("server_type", ""),
                        "current_song": src.get("title", ""),
                        "artist": src.get("artist", ""),
                        "server_name": src.get("server_name", ""),
                        "connected_since": src.get("stream_start", ""),
                        "total_bytes_sent": self._safe_int(src.get("total_bytes_sent", 0)),
                        "total_bytes_read": self._safe_int(src.get("total_bytes_read", 0)),
                        "slow_listeners": self._safe_int(src.get("slow_listeners", 0)),
                        "active": True,
                    }

            # Mountpoint no encontrado = stream offline
            return {"mount": mount_point, "listeners": 0, "active": False}

        except Exception as e:
            logger.error(f"Error obteniendo stats de mount {mount_point}: {e}")
            return None

    async def get_mount_listeners(self, mount_point: str) -> List[Dict[str, Any]]:
        """
        Lista de clientes conectados a un mountpoint.
        Útil para ver IPs, tiempo de conexión, etc.
        """
        if not mount_point.startswith("/"):
            mount_point = "/" + mount_point

        data = await self._get_xml("/admin/listclients", params={"mount": mount_point})
        if not data:
            return []

        try:
            ic = data.get("icestats", {})
            source = ic.get("source", {})
            listeners = source.get("listener", [])
            if isinstance(listeners, dict):
                listeners = [listeners]

            result = []
            for l in listeners:
                result.append({
                    "id": l.get("@id", l.get("ID", "")),
                    "ip": l.get("IP", ""),
                    "user_agent": l.get("UserAgent", ""),
                    "connected_seconds": self._safe_int(l.get("Connected", 0)),
                    "lag": self._safe_int(l.get("lag", 0)),
                })
            return result
        except Exception as e:
            logger.error(f"Error listando clientes de {mount_point}: {e}")
            return []

    async def kick_client(self, mount_point: str, client_id: str) -> bool:
        """Desconecta un cliente específico de un mountpoint."""
        if not mount_point.startswith("/"):
            mount_point = "/" + mount_point
        text = await self._get_raw(
            "/admin/killclient",
            params={"mount": mount_point, "id": client_id}
        )
        return text is not None and "icecast" in (text or "").lower()

    async def get_current_track(self, mount_point: str) -> Optional[Dict[str, str]]:
        """
        Obtiene la canción actual que suena en el mountpoint.
        Combina datos de /admin/stats para ese mount.
        """
        stats = await self.get_mount_stats(mount_point)
        if not stats:
            return None
        return {
            "title": stats.get("current_song", ""),
            "artist": stats.get("artist", ""),
            "active": stats.get("active", False),
        }

    async def update_metadata(self, mount_point: str, song: str, admin_password: str = None) -> bool:
        """
        Actualiza el título de canción que IceCast transmite a los oyentes.
        Útil cuando el AutoDJ cambia de track.
        """
        if not mount_point.startswith("/"):
            mount_point = "/" + mount_point
        pwd = admin_password or self.admin_password
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                r = await client.get(
                    f"{self._base_url}/admin/metadata",
                    auth=("admin", pwd),
                    params={"mount": mount_point, "mode": "updinfo", "song": song}
                )
                return r.status_code == 200
        except Exception as e:
            logger.error(f"Error actualizando metadata en {mount_point}: {e}")
            return False


# ── Instancia global (singleton) ──────────────────────────────
# Se inicializa en startup_event() de server.py con los datos de Settings

_icecast_client: Optional[IceCastClient] = None


def get_icecast_client() -> Optional[IceCastClient]:
    return _icecast_client


def init_icecast_client(host: str, port: int, password: str) -> IceCastClient:
    global _icecast_client
    _icecast_client = IceCastClient(host=host, port=port, admin_password=password)
    logger.info(f"IceCast client initialized → {host}:{port}")
    return _icecast_client


# ── Background task: sincronizar listeners ────────────────────

async def sync_icecast_listeners(db) -> None:
    """
    Tarea de fondo que se ejecuta cada 15 segundos.
    Consulta IceCast y actualiza current_listeners en MongoDB
    para cada stream activo.

    Iniciar desde startup_event() con:
        asyncio.create_task(poll_icecast_forever(db))
    """
    client = get_icecast_client()
    if not client:
        return

    try:
        mounts = await client.list_mounts()
        mount_map = {m["mount"]: m for m in mounts}

        # Streams que MongoDB cree que están online
        streams = await db.streams.find({"status": "online"}).to_list(1000)

        for stream in streams:
            mount = stream.get("mount_point", "/stream")
            if not mount.startswith("/"):
                mount = "/" + mount

            mount_data = mount_map.get(mount)

            if mount_data:
                # El mountpoint existe en IceCast → actualizar listeners y track
                await db.streams.update_one(
                    {"id": stream["id"]},
                    {"$set": {
                        "current_listeners": mount_data["listeners"],
                        "current_track": mount_data.get("current_song") or stream.get("current_track"),
                        "updated_at": datetime.utcnow(),
                    }}
                )
            else:
                # Mountpoint no encontrado en IceCast → el stream se cayó
                logger.warning(
                    f"Stream '{stream['name']}' marcado online pero mountpoint "
                    f"'{mount}' no encontrado en IceCast. Marcando offline."
                )
                await db.streams.update_one(
                    {"id": stream["id"]},
                    {"$set": {
                        "status": "offline",
                        "current_listeners": 0,
                        "updated_at": datetime.utcnow(),
                    }}
                )

    except Exception as e:
        logger.error(f"Error en sync_icecast_listeners: {e}")


async def poll_icecast_forever(db, interval: int = 15) -> None:
    """Loop infinito para sincronizar listeners cada `interval` segundos."""
    logger.info(f"Iniciando poll de IceCast cada {interval}s")
    while True:
        await sync_icecast_listeners(db)
        await asyncio.sleep(interval)


# ══════════════════════════════════════════════════════════════════
# CAMBIOS NECESARIOS EN server.py
# ══════════════════════════════════════════════════════════════════
#
# 1. IMPORTAR este módulo al inicio de server.py:
#
#    from icecast_integration import (
#        init_icecast_client, get_icecast_client, poll_icecast_forever
#    )
#
# ──────────────────────────────────────────────────────────────────
#
# 2. REEMPLAZAR startup_event() por:
#
#    @app.on_event("startup")
#    async def startup_event():
#        try:
#            await client.admin.command("ping")
#            logging.info("Connected to MongoDB successfully")
#        except Exception as e:
#            logging.error(f"MongoDB connection failed: {e}")
#        await init_default_data()
#
#        # Inicializar cliente IceCast
#        settings = await db.settings.find_one({"id": "global"}) or {}
#        init_icecast_client(
#            host=settings.get("icecastHost", "centovacast-icecast"),
#            port=settings.get("icecastPort", 8000),
#            password=settings.get("icecastPassword", "icecast123"),
#        )
#        # Iniciar polling de listeners en background
#        asyncio.create_task(poll_icecast_forever(db))
#        logging.info("Clonetova server started")
#
# ──────────────────────────────────────────────────────────────────
#
# 3. REEMPLAZAR start_stream_endpoint() por:
#
#    @api_router.post("/streams/{stream_id}/start")
#    async def start_stream_endpoint(stream_id: str, current_user: User = Depends(get_current_user)):
#        stream_data = await db.streams.find_one({"id": stream_id})
#        if not stream_data:
#            raise HTTPException(status_code=404, detail="Stream not found")
#
#        ic = get_icecast_client()
#        icecast_alive = await ic.is_alive() if ic else False
#
#        mount = stream_data.get("mount_point", "/stream")
#        mount_stats = await ic.get_mount_stats(mount) if ic else None
#        already_live = mount_stats and mount_stats.get("active", False) if mount_stats else False
#
#        await db.streams.update_one(
#            {"id": stream_id},
#            {"$set": {"status": "online", "uptime": datetime.utcnow(), "updated_at": datetime.utcnow()}}
#        )
#        await log_activity(f"Stream '{stream_data['name']}' iniciado", "stream")
#
#        return {
#            "status": "success",
#            "message": "Stream marcado como online",
#            "icecast_connected": icecast_alive,
#            "mount_active": already_live,
#            "note": "El source (Liquidsoap/Icecast source client) debe conectarse al mountpoint para transmitir audio."
#        }
#
# ──────────────────────────────────────────────────────────────────
#
# 4. AGREGAR estos nuevos endpoints después de /streams/{stream_id}/restart:
#
# (Ver la sección de "Nuevos endpoints" a continuación)
#
# ──────────────────────────────────────────────────────────────────
#
# 5. ACTUALIZAR get_dashboard_stats() para leer listeners reales de IceCast:
#
#    @api_router.get("/dashboard/stats")
#    async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
#        ic = get_icecast_client()
#        server_stats = await ic.get_server_stats() if ic else {}
#
#        total_streams = await db.streams.count_documents({})
#        active_streams = await db.streams.count_documents({"status": "online"})
#        total_tracks = await db.media.count_documents({})
#
#        # Listeners reales de IceCast
#        total_listeners = server_stats.get("listeners", 0)
#        if total_listeners == 0:
#            # Fallback a suma de MongoDB
#            cursor = db.streams.aggregate([
#                {"$match": {"status": "online"}},
#                {"$group": {"_id": None, "total": {"$sum": "$current_listeners"}}}
#            ])
#            result = await cursor.to_list(1)
#            total_listeners = result[0]["total"] if result else 0
#
#        try:
#            proc = psutil.Process(1)
#            uptime_seconds = (datetime.utcnow() - datetime.utcfromtimestamp(proc.create_time())).total_seconds()
#            days = int(uptime_seconds // 86400)
#            hours = int((uptime_seconds % 86400) // 3600)
#            minutes = int((uptime_seconds % 3600) // 60)
#            uptime_str = f"{days}d {hours}h {minutes}m"
#        except:
#            uptime_str = "N/A"
#
#        return {
#            "totalStreams": total_streams,
#            "activeStreams": active_streams,
#            "totalListeners": total_listeners,
#            "totalTracks": total_tracks,
#            "serverUptime": uptime_str,
#            "icecastOnline": server_stats.get("online", False),
#        }
#
# ══════════════════════════════════════════════════════════════════
