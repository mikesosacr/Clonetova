"""
icecast_integration.py — Clonetova
Integración con IceCast Admin API
"""

import httpx
import xmltodict
import logging
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime

logger = logging.getLogger(__name__)


class IceCastClient:

    def __init__(self, host: str, port: int, admin_password: str, timeout: float = 8.0):
        self.host = host
        self.port = port
        self.admin_password = admin_password
        self.timeout = timeout
        self._base_url = f"http://{host}:{port}"
        self._auth = ("admin", admin_password)

    async def _get_xml(self, path: str, params: dict = None) -> Optional[Dict]:
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

    async def is_alive(self) -> bool:
        data = await self._get_xml("/admin/stats")
        return data is not None

    async def get_server_stats(self) -> Dict[str, Any]:
        data = await self._get_xml("/admin/stats")
        if not data:
            return {"online": False, "total_listeners": 0, "sources": 0}
        try:
            ic = data.get("icestats", {}) or {}
            return {
                "online": True,
                "admin": ic.get("admin", ""),
                "host": ic.get("host", ""),
                "server_id": ic.get("server_id", ""),
                "server_start": ic.get("server_start", ""),
                "total_listeners": self._safe_int(ic.get("clients", 0)),
                "total_connections": self._safe_int(ic.get("connections", 0)),
                "sources": self._safe_int(ic.get("sources", 0)),
                "listeners": self._safe_int(ic.get("listeners", 0)),
            }
        except Exception as e:
            logger.error(f"Error parseando stats de IceCast: {e}")
            return {"online": True, "total_listeners": 0, "sources": 0}

    async def list_mounts(self) -> List[Dict[str, Any]]:
        data = await self._get_xml("/admin/listmounts")
        if not data:
            return []
        try:
            ic = data.get("icestats") or {}
            if not ic:
                return []
            sources = ic.get("source")
            if not sources:
                return []
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
        if not mount_point.startswith("/"):
            mount_point = "/" + mount_point
        data = await self._get_xml("/admin/stats")
        if not data:
            return None
        try:
            ic = data.get("icestats") or {}
            sources = ic.get("source")
            if not sources:
                return {"mount": mount_point, "listeners": 0, "active": False}
            if isinstance(sources, dict):
                sources = [sources]
            for src in sources:
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
                        "active": True,
                    }
            return {"mount": mount_point, "listeners": 0, "active": False}
        except Exception as e:
            logger.error(f"Error obteniendo stats de mount {mount_point}: {e}")
            return None

    async def get_mount_listeners(self, mount_point: str) -> List[Dict[str, Any]]:
        if not mount_point.startswith("/"):
            mount_point = "/" + mount_point
        data = await self._get_xml("/admin/listclients", params={"mount": mount_point})
        if not data:
            return []
        try:
            ic = data.get("icestats") or {}
            source = ic.get("source") or {}
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
        if not mount_point.startswith("/"):
            mount_point = "/" + mount_point
        text = await self._get_raw("/admin/killclient", params={"mount": mount_point, "id": client_id})
        return text is not None and "icecast" in (text or "").lower()

    async def get_current_track(self, mount_point: str) -> Optional[Dict[str, str]]:
        stats = await self.get_mount_stats(mount_point)
        if not stats:
            return None
        return {
            "title": stats.get("current_song", ""),
            "artist": stats.get("artist", ""),
            "active": stats.get("active", False),
        }

    async def update_metadata(self, mount_point: str, song: str, admin_password: str = None) -> bool:
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


_icecast_client: Optional[IceCastClient] = None


def get_icecast_client() -> Optional[IceCastClient]:
    return _icecast_client


def init_icecast_client(host: str, port: int, password: str) -> IceCastClient:
    global _icecast_client
    _icecast_client = IceCastClient(host=host, port=port, admin_password=password)
    logger.info(f"IceCast client initialized → {host}:{port}")
    return _icecast_client


async def sync_icecast_listeners(db) -> None:
    client = get_icecast_client()
    if not client:
        return
    try:
        mounts = await client.list_mounts()
        mount_map = {m["mount"]: m for m in mounts}
        streams = await db.streams.find({"status": "online"}).to_list(1000)
        for stream in streams:
            mount = stream.get("mount_point", "/stream")
            if not mount.startswith("/"):
                mount = "/" + mount
            mount_data = mount_map.get(mount)
            if mount_data:
                await db.streams.update_one(
                    {"id": stream["id"]},
                    {"$set": {
                        "current_listeners": mount_data["listeners"],
                        "current_track": mount_data.get("current_song") or stream.get("current_track"),
                        "updated_at": datetime.utcnow(),
                    }}
                )
            else:
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
    logger.info(f"Iniciando poll de IceCast cada {interval}s")
    while True:
        await sync_icecast_listeners(db)
        await asyncio.sleep(interval)
