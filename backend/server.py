from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import os
import logging
import uuid
import asyncio
import psutil
from pathlib import Path
import aiofiles
import mutagen
from mutagen.mp3 import MP3
from mutagen.flac import FLAC
from mutagen.oggvorbis import OggVorbis
from mutagen.aac import AAC

# ── NUEVO: IceCast integration ─────────────────────────────────
from icecast_integration import (
    init_icecast_client,
    get_icecast_client,
    poll_icecast_forever,
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

from dotenv import load_dotenv
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
db = client[os.environ.get('DB_NAME', 'clonetova')]

# Security
SECRET_KEY = os.environ.get("SECRET_KEY", "change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

app = FastAPI(title="Clonetova API", version="1.0.0")
api_router = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MEDIA_DIR = Path("/app/media")
MEDIA_DIR.mkdir(exist_ok=True)

# ── Models ────────────────────────────────────────────────────
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    role: str = "user"
    status: str = "active"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str = "user"

class UserLogin(BaseModel):
    email: str
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    password: Optional[str] = None

class Stream(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = ""
    port: int
    mount_point: str = "/stream"
    bitrate: int = 128
    format: str = "MP3"
    max_listeners: int = 50
    password: str
    status: str = "offline"
    current_listeners: int = 0
    uptime: Optional[datetime] = None
    current_track: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class StreamCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    port: int
    mount_point: str = "/stream"
    bitrate: int = 128
    format: str = "MP3"
    max_listeners: int = 50
    password: str

class StreamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    max_listeners: Optional[int] = None
    password: Optional[str] = None

class MediaTrack(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    title: Optional[str] = None
    artist: Optional[str] = None
    album: Optional[str] = None
    duration: Optional[int] = None
    file_size: Optional[int] = None
    file_path: str
    url: Optional[str] = None
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)

class Playlist(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    stream_id: str
    track_ids: List[str] = []
    shuffle: bool = True
    crossfade: int = 5
    schedule: str = "continuous"
    enabled: bool = False
    track_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PlaylistCreate(BaseModel):
    name: str
    stream_id: str
    shuffle: bool = True
    crossfade: int = 5
    schedule: str = "continuous"

class Settings(BaseModel):
    serverName: str = "Clonetova Server"
    adminEmail: str = ""
    enableRegistration: bool = True
    defaultBitrate: int = 128
    maxStreams: int = 10
    enableAutoDJ: bool = True
    icecastHost: str = "centovacast-icecast"
    icecastPort: int = 8000
    icecastPassword: str = "icecast123"

class Activity(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    message: str
    type: str = "info"
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# ── Helpers ───────────────────────────────────────────────────
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)

def get_password_hash(password):
    return pwd_context.hash(password)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    exc = HTTPException(status_code=401, detail="Could not validate credentials", headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email:
            raise exc
    except JWTError:
        raise exc
    user = await db.users.find_one({"email": email})
    if not user:
        raise exc
    return User(**user)

async def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

async def log_activity(message: str, type: str = "info"):
    activity = {
        "id": str(uuid.uuid4()),
        "message": message,
        "type": type,
        "timestamp": datetime.utcnow()
    }
    await db.activity.insert_one(activity)

def get_audio_metadata(file_path: Path) -> dict:
    meta = {"duration": None, "title": None, "artist": None, "album": None}
    try:
        suffix = file_path.suffix.lower()
        if suffix == '.mp3':
            audio = MP3(str(file_path))
            meta["duration"] = int(audio.info.length)
            tags = audio.tags
            if tags:
                meta["title"] = str(tags.get("TIT2", [file_path.stem])[0])
                meta["artist"] = str(tags.get("TPE1", [None])[0]) if tags.get("TPE1") else None
                meta["album"] = str(tags.get("TALB", [None])[0]) if tags.get("TALB") else None
        elif suffix == '.flac':
            audio = FLAC(str(file_path))
            meta["duration"] = int(audio.info.length)
            meta["title"] = audio.get("title", [file_path.stem])[0]
            meta["artist"] = audio.get("artist", [None])[0]
            meta["album"] = audio.get("album", [None])[0]
        elif suffix == '.ogg':
            audio = OggVorbis(str(file_path))
            meta["duration"] = int(audio.info.length)
            meta["title"] = audio.get("title", [file_path.stem])[0]
            meta["artist"] = audio.get("artist", [None])[0]
            meta["album"] = audio.get("album", [None])[0]
    except Exception as e:
        logging.warning(f"Could not read metadata from {file_path}: {e}")
        meta["title"] = file_path.stem
    return meta

async def init_default_data():
    user_count = await db.users.count_documents({})
    if user_count == 0:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "name": "Administrator",
            "email": "admin@clonetova.local",
            "password": get_password_hash("admin123"),
            "role": "admin",
            "status": "active",
            "created_at": datetime.utcnow(),
        })
        logging.info("Default admin user created: admin@clonetova.local / admin123")

    settings_count = await db.settings.count_documents({})
    if settings_count == 0:
        await db.settings.insert_one({
            "id": "global",
            "serverName": "Clonetova Server",
            "adminEmail": "admin@clonetova.local",
            "enableRegistration": True,
            "defaultBitrate": 128,
            "maxStreams": 10,
            "enableAutoDJ": True,
            "icecastHost": "centovacast-icecast",
            "icecastPort": 8000,
            "icecastPassword": "icecast123"
        })
        logging.info("Default settings created")

# ── Auth ──────────────────────────────────────────────────────
@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    await db.users.update_one({"email": user_data.email}, {"$set": {"last_login": datetime.utcnow()}})
    await log_activity(f"Usuario '{user['name']}' inició sesión", "auth")
    token = create_access_token({"sub": user["email"]})
    return {"access_token": token, "token_type": "bearer", "user": User(**user)}

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.put("/auth/me")
async def update_me(data: UserUpdate, current_user: User = Depends(get_current_user)):
    update = {}
    if data.name: update["name"] = data.name
    if data.email: update["email"] = data.email
    if data.password: update["password"] = get_password_hash(data.password)
    if update:
        await db.users.update_one({"id": current_user.id}, {"$set": update})
    return {"message": "Profile updated"}

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    if await db.users.find_one({"email": user_data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user_dict = user_data.dict()
    user_dict["password"] = get_password_hash(user_dict["password"])
    user_dict["id"] = str(uuid.uuid4())
    user_dict["created_at"] = datetime.utcnow()
    user_dict["status"] = "active"
    await db.users.insert_one(user_dict)
    return {"message": "User created successfully"}

# ── Dashboard ─────────────────────────────────────────────────
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    # NUEVO: obtener listeners reales de IceCast
    ic = get_icecast_client()
    server_stats = await ic.get_server_stats() if ic else {}

    total_streams = await db.streams.count_documents({})
    active_streams = await db.streams.count_documents({"status": "online"})
    total_tracks = await db.media.count_documents({})

    # Preferir listeners de IceCast, fallback a MongoDB
    total_listeners = server_stats.get("listeners", 0)
    if total_listeners == 0:
        cursor = db.streams.aggregate([
            {"$match": {"status": "online"}},
            {"$group": {"_id": None, "total": {"$sum": "$current_listeners"}}}
        ])
        result = await cursor.to_list(1)
        total_listeners = result[0]["total"] if result else 0

    try:
        proc = psutil.Process(1)
        uptime_seconds = (datetime.utcnow() - datetime.utcfromtimestamp(proc.create_time())).total_seconds()
        days = int(uptime_seconds // 86400)
        hours = int((uptime_seconds % 86400) // 3600)
        minutes = int((uptime_seconds % 3600) // 60)
        uptime_str = f"{days}d {hours}h {minutes}m"
    except:
        uptime_str = "N/A"

    return {
        "totalStreams": total_streams,
        "activeStreams": active_streams,
        "totalListeners": total_listeners,
        "totalTracks": total_tracks,
        "serverUptime": uptime_str,
        "icecastOnline": server_stats.get("online", False),  # NUEVO
        "icecastSources": server_stats.get("sources", 0),   # NUEVO
    }

@api_router.get("/dashboard/recent-activity")
async def get_recent_activity(current_user: User = Depends(get_current_user)):
    activities = await db.activity.find().sort("timestamp", -1).to_list(20)
    result = []
    for a in activities:
        ts = a.get("timestamp", datetime.utcnow())
        diff = datetime.utcnow() - ts
        if diff.total_seconds() < 60:
            time_str = "Hace un momento"
        elif diff.total_seconds() < 3600:
            time_str = f"Hace {int(diff.total_seconds() // 60)} min"
        elif diff.total_seconds() < 86400:
            time_str = f"Hace {int(diff.total_seconds() // 3600)}h"
        else:
            time_str = f"Hace {int(diff.days)} días"
        result.append({"message": a["message"], "timestamp": time_str, "type": a.get("type", "info")})
    return result

@api_router.get("/dashboard/notifications")
async def get_notifications(current_user: User = Depends(get_current_user)):
    activities = await db.activity.find().sort("timestamp", -1).to_list(10)
    result = []
    for a in activities:
        ts = a.get("timestamp", datetime.utcnow())
        diff = datetime.utcnow() - ts
        if diff.total_seconds() < 60:
            time_str = "Hace un momento"
        elif diff.total_seconds() < 3600:
            time_str = f"Hace {int(diff.total_seconds() // 60)} min"
        else:
            time_str = f"Hace {int(diff.total_seconds() // 3600)}h"
        result.append({
            "id": a.get("id", str(uuid.uuid4())),
            "message": a["message"],
            "timestamp": time_str,
            "type": a.get("type", "info"),
            "read": a.get("read", False)
        })
    return result

@api_router.put("/dashboard/notifications/read-all")
async def mark_all_notifications_read(current_user: User = Depends(get_current_user)):
    await db.activity.update_many({}, {"$set": {"read": True}})
    return {"message": "All notifications marked as read"}

# ── Streams ───────────────────────────────────────────────────
@api_router.get("/streams", response_model=List[Stream])
async def get_streams(current_user: User = Depends(get_current_user)):
    streams = await db.streams.find().to_list(1000)
    return [Stream(**s) for s in streams]

@api_router.get("/streams/active", response_model=List[Stream])
async def get_active_streams(current_user: User = Depends(get_current_user)):
    streams = await db.streams.find({"status": "online"}).to_list(1000)
    return [Stream(**s) for s in streams]

@api_router.post("/streams", response_model=Stream)
async def create_stream(stream_data: StreamCreate, current_user: User = Depends(get_current_user)):
    if await db.streams.find_one({"port": stream_data.port}):
        raise HTTPException(status_code=400, detail="Puerto ya en uso")
    stream_dict = stream_data.dict()
    stream_dict["id"] = str(uuid.uuid4())
    stream_dict["status"] = "offline"
    stream_dict["current_listeners"] = 0
    stream_dict["created_at"] = datetime.utcnow()
    stream_dict["updated_at"] = datetime.utcnow()
    await db.streams.insert_one(stream_dict)
    await log_activity(f"Stream '{stream_data.name}' creado", "stream")
    return Stream(**stream_dict)

@api_router.put("/streams/{stream_id}", response_model=Stream)
async def update_stream(stream_id: str, data: StreamUpdate, current_user: User = Depends(get_current_user)):
    stream = await db.streams.find_one({"id": stream_id})
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    update = {k: v for k, v in data.dict().items() if v is not None}
    update["updated_at"] = datetime.utcnow()
    await db.streams.update_one({"id": stream_id}, {"$set": update})
    stream.update(update)
    return Stream(**stream)

@api_router.post("/streams/{stream_id}/start")
async def start_stream_endpoint(stream_id: str, current_user: User = Depends(get_current_user)):
    stream_data = await db.streams.find_one({"id": stream_id})
    if not stream_data:
        raise HTTPException(status_code=404, detail="Stream not found")

    # NUEVO: verificar estado real en IceCast
    ic = get_icecast_client()
    icecast_alive = await ic.is_alive() if ic else False

    mount = stream_data.get("mount_point", "/stream")
    mount_stats = await ic.get_mount_stats(mount) if ic else None
    already_live = bool(mount_stats and mount_stats.get("active", False))

    await db.streams.update_one(
        {"id": stream_id},
        {"$set": {"status": "online", "uptime": datetime.utcnow(), "updated_at": datetime.utcnow()}}
    )
    await log_activity(f"Stream '{stream_data['name']}' iniciado", "stream")

    return {
        "status": "success",
        "message": "Stream marcado como online",
        "icecast_connected": icecast_alive,
        "mount_active": already_live,
        # Si mount_active es False, IceCast está up pero nadie está conectando audio a ese mountpoint.
        # El source client (Liquidsoap / Butt / IDJC) debe conectarse al puerto configurado.
        "note": "Para transmitir audio, conecta tu source client (Liquidsoap/Butt) al mountpoint." if not already_live else "Mountpoint activo en IceCast.",
    }

@api_router.post("/streams/{stream_id}/stop")
async def stop_stream_endpoint(stream_id: str, current_user: User = Depends(get_current_user)):
    stream_data = await db.streams.find_one({"id": stream_id})
    if not stream_data:
        raise HTTPException(status_code=404, detail="Stream not found")

    # NUEVO: desconectar todos los clientes del mountpoint en IceCast
    ic = get_icecast_client()
    kicked_count = 0
    if ic:
        mount = stream_data.get("mount_point", "/stream")
        listeners = await ic.get_mount_listeners(mount)
        for listener in listeners:
            client_id = listener.get("id")
            if client_id:
                await ic.kick_client(mount, str(client_id))
                kicked_count += 1

    await db.streams.update_one(
        {"id": stream_id},
        {"$set": {"status": "offline", "current_listeners": 0, "uptime": None, "updated_at": datetime.utcnow()}}
    )
    await log_activity(f"Stream '{stream_data['name']}' detenido", "stream")
    return {
        "status": "success",
        "message": "Stream detenido",
        "listeners_kicked": kicked_count,
    }

@api_router.post("/streams/{stream_id}/restart")
async def restart_stream(stream_id: str, current_user: User = Depends(get_current_user)):
    await stop_stream_endpoint(stream_id, current_user)
    await asyncio.sleep(1)
    return await start_stream_endpoint(stream_id, current_user)

@api_router.delete("/streams/{stream_id}")
async def delete_stream(stream_id: str, current_user: User = Depends(get_current_user)):
    stream_data = await db.streams.find_one({"id": stream_id})
    if not stream_data:
        raise HTTPException(status_code=404, detail="Stream not found")
    await db.streams.delete_one({"id": stream_id})
    await log_activity(f"Stream '{stream_data['name']}' eliminado", "stream")
    return {"message": "Stream eliminado"}

# ── NUEVOS: Stream stats desde IceCast ────────────────────────

@api_router.get("/streams/{stream_id}/stats")
async def get_stream_stats(stream_id: str, current_user: User = Depends(get_current_user)):
    """
    Estadísticas en tiempo real del stream consultando IceCast directamente.
    Devuelve listeners actuales, peak, canción actual, bitrate, etc.
    """
    stream_data = await db.streams.find_one({"id": stream_id})
    if not stream_data:
        raise HTTPException(status_code=404, detail="Stream not found")

    ic = get_icecast_client()
    mount = stream_data.get("mount_point", "/stream")

    if ic:
        mount_stats = await ic.get_mount_stats(mount)
    else:
        mount_stats = None

    # Merge de datos IceCast + MongoDB
    listeners = 0
    peak_listeners = 0
    current_track = stream_data.get("current_track", "")
    artist = ""
    bitrate = stream_data.get("bitrate", 128)
    active_in_icecast = False

    if mount_stats and mount_stats.get("active"):
        active_in_icecast = True
        listeners = mount_stats.get("listeners", 0)
        peak_listeners = mount_stats.get("peak_listeners", 0)
        current_track = mount_stats.get("current_song", current_track)
        artist = mount_stats.get("artist", "")
        bitrate = mount_stats.get("bitrate", bitrate) or bitrate

    return {
        "stream_id": stream_id,
        "name": stream_data.get("name"),
        "mount_point": mount,
        "status": stream_data.get("status"),
        "active_in_icecast": active_in_icecast,
        "current_listeners": listeners,
        "peak_listeners": peak_listeners,
        "max_listeners": stream_data.get("max_listeners", 50),
        "current_track": current_track,
        "artist": artist,
        "bitrate": bitrate,
        "format": stream_data.get("format", "MP3"),
        "uptime": stream_data.get("uptime"),
        "stream_url": f"http://{{host}}:{stream_data.get('port', 8000)}{mount}",
    }

@api_router.get("/streams/{stream_id}/listeners")
async def get_stream_listeners(stream_id: str, current_user: User = Depends(get_current_user)):
    """
    Lista de oyentes conectados actualmente al stream (desde IceCast).
    """
    stream_data = await db.streams.find_one({"id": stream_id})
    if not stream_data:
        raise HTTPException(status_code=404, detail="Stream not found")

    ic = get_icecast_client()
    if not ic:
        return {"listeners": [], "count": 0, "note": "IceCast no disponible"}

    mount = stream_data.get("mount_point", "/stream")
    listeners = await ic.get_mount_listeners(mount)

    return {
        "stream_id": stream_id,
        "mount_point": mount,
        "count": len(listeners),
        "listeners": listeners,
    }

@api_router.delete("/streams/{stream_id}/listeners/{client_id}")
async def kick_listener(stream_id: str, client_id: str, current_user: User = Depends(require_admin)):
    """
    Desconecta un oyente específico del stream.
    Requiere rol admin.
    """
    stream_data = await db.streams.find_one({"id": stream_id})
    if not stream_data:
        raise HTTPException(status_code=404, detail="Stream not found")

    ic = get_icecast_client()
    if not ic:
        raise HTTPException(status_code=503, detail="IceCast no disponible")

    mount = stream_data.get("mount_point", "/stream")
    success = await ic.kick_client(mount, client_id)

    if not success:
        raise HTTPException(status_code=500, detail="No se pudo desconectar al oyente")

    await log_activity(f"Oyente {client_id} desconectado del stream '{stream_data['name']}'", "stream")
    return {"message": f"Oyente {client_id} desconectado"}

@api_router.get("/streams/{stream_id}/current-track")
async def get_current_track(stream_id: str, current_user: User = Depends(get_current_user)):
    """
    Canción que está sonando actualmente en el stream según IceCast.
    """
    stream_data = await db.streams.find_one({"id": stream_id})
    if not stream_data:
        raise HTTPException(status_code=404, detail="Stream not found")

    ic = get_icecast_client()
    mount = stream_data.get("mount_point", "/stream")

    if ic:
        track = await ic.get_current_track(mount)
    else:
        track = None

    return {
        "stream_id": stream_id,
        "mount_point": mount,
        "current_track": track.get("title", "") if track else stream_data.get("current_track", ""),
        "artist": track.get("artist", "") if track else "",
        "active": track.get("active", False) if track else False,
        "source": "icecast" if track else "mongodb",
    }

@api_router.put("/streams/{stream_id}/metadata")
async def update_stream_metadata(
    stream_id: str,
    body: dict,
    current_user: User = Depends(get_current_user)
):
    """
    Actualiza el título de la canción que IceCast muestra a los oyentes.
    Body: { "song": "Artista - Título" }
    Útil cuando el AutoDJ cambia de track.
    """
    stream_data = await db.streams.find_one({"id": stream_id})
    if not stream_data:
        raise HTTPException(status_code=404, detail="Stream not found")

    song = body.get("song", "")
    if not song:
        raise HTTPException(status_code=400, detail="El campo 'song' es requerido")

    ic = get_icecast_client()
    if not ic:
        raise HTTPException(status_code=503, detail="IceCast no disponible")

    mount = stream_data.get("mount_point", "/stream")
    success = await ic.update_metadata(mount, song)

    # También actualizar en MongoDB
    await db.streams.update_one(
        {"id": stream_id},
        {"$set": {"current_track": song, "updated_at": datetime.utcnow()}}
    )

    return {
        "message": "Metadata actualizada",
        "song": song,
        "icecast_updated": success,
    }

# ── IceCast status endpoint ───────────────────────────────────

@api_router.get("/icecast/status")
async def get_icecast_status(current_user: User = Depends(get_current_user)):
    """
    Estado global del servidor IceCast: versión, listeners totales,
    fuentes activas, bandwidth, etc.
    """
    ic = get_icecast_client()
    if not ic:
        return {"online": False, "error": "IceCast client no inicializado"}

    stats = await ic.get_server_stats()
    mounts = await ic.list_mounts()

    return {
        **stats,
        "mounts": mounts,
    }

@api_router.get("/icecast/mounts")
async def list_icecast_mounts(current_user: User = Depends(get_current_user)):
    """
    Lista todos los mountpoints activos en IceCast con sus stats.
    """
    ic = get_icecast_client()
    if not ic:
        return []
    return await ic.list_mounts()

# ── Media ─────────────────────────────────────────────────────
@api_router.get("/media", response_model=List[MediaTrack])
async def get_media(current_user: User = Depends(get_current_user)):
    tracks = await db.media.find().to_list(1000)
    result = []
    for t in tracks:
        t["url"] = f"/api/media/{t['id']}/stream"
        result.append(MediaTrack(**t))
    return result

@api_router.get("/media/{track_id}/stream")
async def stream_media(track_id: str, token: Optional[str] = None):
    from fastapi.responses import FileResponse
    if token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            if not payload.get("sub"):
                raise HTTPException(status_code=401, detail="Invalid token")
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid token")
    track = await db.media.find_one({"id": track_id})
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    file_path = Path(track["file_path"])
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")
    suffix = file_path.suffix.lower()
    types = {".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".flac": "audio/flac", ".wav": "audio/wav", ".aac": "audio/aac"}
    return FileResponse(str(file_path), media_type=types.get(suffix, "audio/mpeg"))

@api_router.post("/media/upload")
async def upload_media(files: List[UploadFile] = File(...), current_user: User = Depends(get_current_user)):
    uploaded = []
    for file in files:
        if not file.filename.lower().endswith(('.mp3', '.wav', '.flac', '.aac', '.ogg')):
            continue
        file_id = str(uuid.uuid4())
        file_ext = Path(file.filename).suffix.lower()
        new_filename = f"{file_id}{file_ext}"
        file_path = MEDIA_DIR / new_filename
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        meta = get_audio_metadata(file_path)
        original_stem = Path(file.filename).stem
        track = {
            "id": file_id,
            "filename": file.filename,
            "title": meta["title"] if meta["title"] and meta["title"] != file_id else original_stem,
            "artist": meta["artist"],
            "album": meta["album"],
            "duration": meta["duration"],
            "file_size": len(content),
            "file_path": str(file_path),
            "url": f"/api/media/{file_id}/stream",
            "uploaded_at": datetime.utcnow()
        }
        await db.media.insert_one(track)
        await log_activity(f"Pista '{track['title']}' subida por {current_user.name}", "media")
        uploaded.append(MediaTrack(**track))
    return {"message": f"{len(uploaded)} archivo(s) subido(s)", "files": uploaded}

@api_router.delete("/media/{track_id}")
async def delete_media(track_id: str, current_user: User = Depends(get_current_user)):
    track = await db.media.find_one({"id": track_id})
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    try:
        Path(track["file_path"]).unlink(missing_ok=True)
    except Exception as e:
        logging.error(f"Error deleting file: {e}")
    await db.media.delete_one({"id": track_id})
    await log_activity(f"Pista '{track['title']}' eliminada", "media")
    return {"message": "Track eliminado"}

# ── AutoDJ ────────────────────────────────────────────────────
@api_router.get("/autodj/playlists", response_model=List[Playlist])
async def get_playlists(current_user: User = Depends(get_current_user)):
    playlists = await db.playlists.find().to_list(1000)
    return [Playlist(**p) for p in playlists]

@api_router.post("/autodj/playlists", response_model=Playlist)
async def create_playlist(data: PlaylistCreate, current_user: User = Depends(get_current_user)):
    stream = await db.streams.find_one({"id": data.stream_id})
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    playlist_dict = data.dict()
    playlist_dict["id"] = str(uuid.uuid4())
    playlist_dict["track_ids"] = []
    playlist_dict["track_count"] = 0
    playlist_dict["enabled"] = False
    playlist_dict["created_at"] = datetime.utcnow()
    await db.playlists.insert_one(playlist_dict)
    await log_activity(f"Playlist '{data.name}' creada", "autodj")
    return Playlist(**playlist_dict)

@api_router.put("/autodj/playlists/{playlist_id}/tracks")
async def update_playlist_tracks(playlist_id: str, track_ids: List[str], current_user: User = Depends(get_current_user)):
    playlist = await db.playlists.find_one({"id": playlist_id})
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    await db.playlists.update_one(
        {"id": playlist_id},
        {"$set": {"track_ids": track_ids, "track_count": len(track_ids)}}
    )
    return {"message": f"Playlist actualizada con {len(track_ids)} pistas"}

@api_router.post("/autodj/playlists/{playlist_id}/enable")
async def enable_playlist(playlist_id: str, current_user: User = Depends(get_current_user)):
    playlist = await db.playlists.find_one({"id": playlist_id})
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    await db.playlists.update_one({"id": playlist_id}, {"$set": {"enabled": True}})
    await log_activity(f"Playlist '{playlist['name']}' habilitada", "autodj")
    return {"message": "Playlist habilitada"}

@api_router.post("/autodj/playlists/{playlist_id}/disable")
async def disable_playlist(playlist_id: str, current_user: User = Depends(get_current_user)):
    playlist = await db.playlists.find_one({"id": playlist_id})
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    await db.playlists.update_one({"id": playlist_id}, {"$set": {"enabled": False}})
    await log_activity(f"Playlist '{playlist['name']}' deshabilitada", "autodj")
    return {"message": "Playlist deshabilitada"}

@api_router.delete("/autodj/playlists/{playlist_id}")
async def delete_playlist(playlist_id: str, current_user: User = Depends(get_current_user)):
    playlist = await db.playlists.find_one({"id": playlist_id})
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    await db.playlists.delete_one({"id": playlist_id})
    await log_activity(f"Playlist '{playlist['name']}' eliminada", "autodj")
    return {"message": "Playlist eliminada"}

# ── Statistics ────────────────────────────────────────────────
@api_router.get("/statistics")
async def get_statistics(current_user: User = Depends(get_current_user)):
    # NUEVO: listeners reales de IceCast
    ic = get_icecast_client()
    server_stats = await ic.get_server_stats() if ic else {}

    total_streams = await db.streams.count_documents({})
    active_streams = await db.streams.count_documents({"status": "online"})
    total_tracks = await db.media.count_documents({})
    total_users = await db.users.count_documents({})

    total_listeners = server_stats.get("listeners", 0)
    if total_listeners == 0:
        cursor = db.streams.aggregate([
            {"$group": {"_id": None, "total": {"$sum": "$current_listeners"}}}
        ])
        result = await cursor.to_list(1)
        total_listeners = result[0]["total"] if result else 0

    return {
        "totalStreams": total_streams,
        "activeStreams": active_streams,
        "totalListeners": total_listeners,
        "totalTracks": total_tracks,
        "totalUsers": total_users,
        "peakListeners": total_listeners,
        "avgListeners": total_listeners,
        "icecastOnline": server_stats.get("online", False),
        "icecastSources": server_stats.get("sources", 0),
    }

# ── Users ─────────────────────────────────────────────────────
@api_router.get("/users", response_model=List[User])
async def get_users(current_user: User = Depends(require_admin)):
    users = await db.users.find({}, {"password": 0}).to_list(1000)
    return [User(**u) for u in users]

@api_router.post("/users", response_model=User)
async def create_user(user_data: UserCreate, current_user: User = Depends(require_admin)):
    if await db.users.find_one({"email": user_data.email}):
        raise HTTPException(status_code=400, detail="Email ya registrado")
    user_dict = user_data.dict()
    user_dict["password"] = get_password_hash(user_dict["password"])
    user_dict["id"] = str(uuid.uuid4())
    user_dict["created_at"] = datetime.utcnow()
    user_dict["status"] = "active"
    await db.users.insert_one(user_dict)
    await log_activity(f"Usuario '{user_data.name}' creado", "user")
    return User(**user_dict)

@api_router.put("/users/{user_id}")
async def update_user(user_id: str, data: UserUpdate, current_user: User = Depends(require_admin)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    update = {k: v for k, v in data.dict().items() if v is not None}
    if "password" in update:
        update["password"] = get_password_hash(update["password"])
    await db.users.update_one({"id": user_id}, {"$set": update})
    return {"message": "Usuario actualizado"}

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: User = Depends(require_admin)):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.users.delete_one({"id": user_id})
    await log_activity(f"Usuario '{user['name']}' eliminado", "user")
    return {"message": "Usuario eliminado"}

# ── Settings ──────────────────────────────────────────────────
@api_router.get("/settings")
async def get_settings(current_user: User = Depends(require_admin)):
    settings = await db.settings.find_one({"id": "global"})
    if not settings:
        return Settings().dict()
    settings.pop("_id", None)
    return settings

@api_router.put("/settings")
async def update_settings(settings: dict, current_user: User = Depends(require_admin)):
    settings.pop("_id", None)
    settings["id"] = "global"
    await db.settings.update_one({"id": "global"}, {"$set": settings}, upsert=True)

    # NUEVO: reinicializar cliente IceCast con la nueva config
    ic_host = settings.get("icecastHost", "centovacast-icecast")
    ic_port = settings.get("icecastPort", 8000)
    ic_pass = settings.get("icecastPassword", "icecast123")
    init_icecast_client(ic_host, ic_port, ic_pass)

    await log_activity("Configuración del servidor actualizada", "settings")
    return {"message": "Configuración guardada"}

@api_router.get("/autodj/next-track")
async def get_next_track(stream_id: str, current_user: User = Depends(get_current_user)):
    """
    Devuelve el próximo track a reproducir para un stream.
    Liquidsoap llama este endpoint cuando necesita la siguiente canción.
    Maneja shuffle y rotación de playlist.
    """
    # Buscar playlist habilitada para este stream
    playlist = await db.playlists.find_one({"stream_id": stream_id, "enabled": True})
    if not playlist or not playlist.get("track_ids"):
        raise HTTPException(status_code=404, detail="No hay playlist activa con tracks para este stream")

    track_ids = playlist["track_ids"]
    shuffle = playlist.get("shuffle", True)

    # Estado de reproducción: qué índice vamos
    state_key = f"playback_{stream_id}"
    state = await db.playback_state.find_one({"key": state_key})
    current_index = state.get("index", 0) if state else 0

    if shuffle:
        import random
        next_index = random.randint(0, len(track_ids) - 1)
    else:
        next_index = current_index % len(track_ids)

    track_id = track_ids[next_index]
    track = await db.media.find_one({"id": track_id})

    if not track:
        raise HTTPException(status_code=404, detail="Track no encontrado en la base de datos")

    # Guardar estado
    await db.playback_state.update_one(
        {"key": state_key},
        {"$set": {"key": state_key, "index": next_index + 1, "last_track_id": track_id, "updated_at": datetime.utcnow()}},
        upsert=True
    )

    await log_activity(f"AutoDJ: reproduciendo '{track.get('title')}' en stream {stream_id}", "autodj")

    return {
        "file_path": track["file_path"],
        "title": track.get("title", ""),
        "artist": track.get("artist", ""),
        "album": track.get("album", ""),
        "duration": track.get("duration", 0),
        "track_id": track_id,
    }
# ── App startup ───────────────────────────────────────────────
app.include_router(api_router)

@app.on_event("startup")
async def startup_event():
    try:
        await client.admin.command("ping")
        logging.info("Connected to MongoDB successfully")
    except Exception as e:
        logging.error(f"MongoDB connection failed: {e}")

    await init_default_data()

    # NUEVO: inicializar IceCast client con settings de DB
    settings = await db.settings.find_one({"id": "global"}) or {}
    ic = init_icecast_client(
        host=settings.get("icecastHost", "centovacast-icecast"),
        port=int(settings.get("icecastPort", 8000)),
        password=settings.get("icecastPassword", "icecast123"),
    )

    # Verificar conexión con IceCast al arrancar
    alive = await ic.is_alive()
    if alive:
        logging.info("IceCast conectado correctamente")
    else:
        logging.warning("IceCast no disponible al arrancar — se reintentará automáticamente")

    # NUEVO: iniciar polling de listeners en background (cada 15s)
    asyncio.create_task(poll_icecast_forever(db, interval=15))

    logging.info("Clonetova server started")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# ── AutoDJ Next Track ─────────────────────────────────────────
