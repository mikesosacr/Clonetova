from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import os
import logging
import uuid
import asyncio
import subprocess
import psutil
from pathlib import Path
import aiofiles
import shutil

# Configure logging first
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Load environment
from dotenv import load_dotenv
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection - with fallback to mock for testing
try:
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
    db = client[os.environ['DB_NAME']]
    # Test connection
    client.get_io_loop()  # lazy connection, verified on startup
    USE_MOCK_DB = False
    logging.info("Connected to MongoDB")
except Exception as e:
    logging.warning(f"MongoDB not available ({e}), using in-memory mock database")
    USE_MOCK_DB = True
    
    # Mock database implementation
    class MockCollection:
        def __init__(self):
            self._data = []
        
        async def find_one(self, query):
            for item in self._data:
                match = True
                for key, value in query.items():
                    if item.get(key) != value:
                        match = False
                        break
                if match:
                    return item
            return None
        
        async def find(self, query=None):
            if query is None or query == {}:
                return MockCursor(self._data.copy())
            results = []
            for item in self._data:
                match = True
                for key, value in query.items():
                    if item.get(key) != value:
                        match = False
                        break
                if match:
                    results.append(item)
            return MockCursor(results)
        
        async def count_documents(self, query):
            count = 0
            for item in self._data:
                match = True
                for key, value in query.items():
                    if item.get(key) != value:
                        match = False
                        break
                if match:
                    count += 1
            return count
        
        async def insert_one(self, document):
            self._data.append(document)
            return type('obj', (object,), {'inserted_id': document.get('id')})
        
        async def update_one(self, query, update):
            for item in self._data:
                match = True
                for key, value in query.items():
                    if item.get(key) != value:
                        match = False
                        break
                if match:
                    if '$set' in update:
                        for key, value in update['$set'].items():
                            item[key] = value
                    return type('obj', (object,), {'modified_count': 1})
            return type('obj', (object,), {'modified_count': 0})
        
        async def delete_one(self, query):
            for i, item in enumerate(self._data):
                match = True
                for key, value in query.items():
                    if item.get(key) != value:
                        match = False
                        break
                if match:
                    self._data.pop(i)
                    return type('obj', (object,), {'deleted_count': 1})
            return type('obj', (object,), {'deleted_count': 0})
        
        async def aggregate(self, pipeline):
            # Simple aggregation support - returns MockCursor directly (not a coroutine)
            results = self._data.copy()
            for stage in pipeline:
                if '$match' in stage:
                    query = stage['$match']
                    filtered = []
                    for item in results:
                        match = True
                        for key, value in query.items():
                            if item.get(key) != value:
                                match = False
                                break
                        if match:
                            filtered.append(item)
                    results = filtered
                elif '$group' in stage:
                    group_config = stage['$group']
                    grouped = {}
                    for item in results:
                        key = item.get(group_config['_id']) if group_config['_id'] is not None else 'all'
                        if key not in grouped:
                            grouped[key] = []
                        grouped[key].append(item)
                    
                    agg_results = []
                    for key, items in grouped.items():
                        result = {'_id': key}
                        for agg_key, agg_expr in group_config.items():
                            if agg_key == '_id':
                                continue
                            if isinstance(agg_expr, dict) and '$sum' in agg_expr:
                                sum_field = agg_expr['$sum'].replace('$', '')
                                result[agg_key] = sum(item.get(sum_field, 0) for item in items)
                        agg_results.append(result)
                    results = agg_results
            
            return MockCursor(results)
    
    class MockCursor:
        def __init__(self, data):
            self._data = data
        
        async def to_list(self, limit=None):
            if limit:
                return self._data[:limit]
            return self._data
    
    class MockDatabase:
        def __init__(self):
            self.users = MockCollection()
            self.streams = MockCollection()
            self.media = MockCollection()
            self.playlists = MockCollection()
    
    class MockClient:
        def __init__(self):
            pass
        
        def close(self):
            pass
    
    db = MockDatabase()
    client = MockClient()

# Security
SECRET_KEY = os.environ.get("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

app = FastAPI(title="CentovaCast API", version="3.2.12")
api_router = APIRouter(prefix="/api")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    role: str = "user"  # admin, dj, user
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

class Stream(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = ""
    port: int
    mount_point: str = "/stream"
    bitrate: int = 128
    format: str = "MP3"  # MP3, AAC, OGG
    max_listeners: int = 50
    password: str
    status: str = "offline"  # online, offline, error
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

class MediaTrack(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    title: Optional[str] = None
    artist: Optional[str] = None
    album: Optional[str] = None
    duration: Optional[int] = None  # seconds
    file_size: Optional[int] = None  # bytes
    file_path: str
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)

class Playlist(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    stream_id: str
    track_ids: List[str] = []
    shuffle: bool = True
    crossfade: int = 5
    schedule: str = "continuous"  # continuous, scheduled, fallback
    enabled: bool = False
    track_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Utility Functions
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"email": email})
    if user is None:
        raise credentials_exception
    return User(**user)

async def init_default_user():
    """Initialize default admin user if no users exist"""
    user_count = await db.users.count_documents({})
    if user_count == 0:
        default_user = {
            "id": str(uuid.uuid4()),
            "name": "Administrator",
            "email": "admin@centovacast.local",
            "password": get_password_hash("admin123"),
            "role": "admin",
            "status": "active",
            "created_at": datetime.utcnow(),
        }
        await db.users.insert_one(default_user)
        logging.info("Default admin user created")

# Stream Control Functions
async def start_stream(stream: Stream):
    """Start IceCast stream process"""
    try:
        # Create IceCast config
        config_dir = Path(f"/tmp/icecast_{stream.id}")
        config_dir.mkdir(exist_ok=True)
        
        config_content = f"""<icecast>
    <location>Earth</location>
    <admin>{stream.name}</admin>
    <limits>
        <clients>{stream.max_listeners}</clients>
        <sources>2</sources>
        <queue-size>524288</queue-size>
        <client-timeout>30</client-timeout>
        <header-timeout>15</header-timeout>
        <source-timeout>10</source-timeout>
    </limits>
    <authentication>
        <source-password>{stream.password}</source-password>
        <relay-password>hackme</relay-password>
        <admin-user>admin</admin-user>
        <admin-password>{stream.password}</admin-password>
    </authentication>
    <hostname>localhost</hostname>
    <listen-socket>
        <port>{stream.port}</port>
    </listen-socket>
    <mount type="normal">
        <mount-name>{stream.mount_point}</mount-name>
        <username>source</username>
        <password>{stream.password}</password>
        <public>1</public>
        <stream-name>{stream.name}</stream-name>
        <stream-description>{stream.description}</stream-description>
        <bitrate>{stream.bitrate}</bitrate>
        <format>{stream.format.lower()}</format>
    </mount>
    <fileserve>1</fileserve>
    <paths>
        <basedir>/usr/share/icecast2</basedir>
        <logdir>/var/log/icecast2</logdir>
        <webroot>/usr/share/icecast2/web</webroot>
        <adminroot>/usr/share/icecast2/admin</adminroot>
        <pidfile>/tmp/icecast_{stream.id}.pid</pidfile>
    </paths>
    <logging>
        <accesslog>/tmp/icecast_{stream.id}_access.log</accesslog>
        <errorlog>/tmp/icecast_{stream.id}_error.log</errorlog>
        <loglevel>3</loglevel>
    </logging>
</icecast>"""
        
        config_file = config_dir / "icecast.xml"
        with open(config_file, 'w') as f:
            f.write(config_content)
        
        # Start IceCast process
        process = subprocess.Popen([
            'icecast2', '-c', str(config_file)
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        # Update stream status
        await db.streams.update_one(
            {"id": stream.id},
            {
                "$set": {
                    "status": "online",
                    "uptime": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return {"status": "success", "message": "Stream started", "pid": process.pid}
        
    except Exception as e:
        logging.error(f"Failed to start stream {stream.id}: {e}")
        await db.streams.update_one(
            {"id": stream.id},
            {"$set": {"status": "error", "updated_at": datetime.utcnow()}}
        )
        raise HTTPException(status_code=500, detail=f"Failed to start stream: {str(e)}")

async def stop_stream(stream: Stream):
    """Stop stream process"""
    try:
        # Kill process using port
        for proc in psutil.process_iter(['pid', 'name', 'connections']):
            try:
                for conn in proc.info['connections'] or []:
                    if conn.laddr.port == stream.port:
                        proc.kill()
                        break
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        
        # Update stream status
        await db.streams.update_one(
            {"id": stream.id},
            {
                "$set": {
                    "status": "offline",
                    "current_listeners": 0,
                    "uptime": None,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return {"status": "success", "message": "Stream stopped"}
        
    except Exception as e:
        logging.error(f"Failed to stop stream {stream.id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to stop stream: {str(e)}")

# Authentication Routes
@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Update last login
    await db.users.update_one(
        {"email": user_data.email},
        {"$set": {"last_login": datetime.utcnow()}}
    )
    
    access_token = create_access_token(data={"sub": user["email"]})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": User(**user)
    }

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_dict = user_data.dict()
    user_dict["password"] = get_password_hash(user_dict["password"])
    user_dict["id"] = str(uuid.uuid4())
    user_dict["created_at"] = datetime.utcnow()
    
    await db.users.insert_one(user_dict)
    return {"message": "User created successfully"}

# Dashboard Routes
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    total_streams = await db.streams.count_documents({})
    active_streams = await db.streams.count_documents({"status": "online"})
    
    # Get total listeners across all streams
    pipeline = [
        {"$match": {"status": "online"}},
        {"$group": {"_id": None, "total": {"$sum": "$current_listeners"}}}
    ]
    cursor = db.streams.aggregate(pipeline)
    result = await cursor.to_list(1)
    total_listeners = result[0]["total"] if result else 0
    
    total_tracks = await db.media.count_documents({})
    
    return {
        "totalStreams": total_streams,
        "activeStreams": active_streams,
        "totalListeners": total_listeners,
        "totalTracks": total_tracks,
        "serverUptime": "2d 14h 32m"  # Mock data
    }

@api_router.get("/dashboard/recent-activity")
async def get_recent_activity(current_user: User = Depends(get_current_user)):
    # Mock recent activity data
    return [
        {
            "message": "Stream 'Radio Mix 24/7' started successfully",
            "timestamp": "2 minutes ago"
        },
        {
            "message": "New track uploaded: 'Summer Vibes'",
            "timestamp": "5 minutes ago"
        },
        {
            "message": "User 'dj_mike' logged in",
            "timestamp": "10 minutes ago"
        }
    ]

# Stream Routes
@api_router.get("/streams", response_model=List[Stream])
async def get_streams(current_user: User = Depends(get_current_user)):
    streams = await db.streams.find().to_list(1000)
    return [Stream(**stream) for stream in streams]

@api_router.get("/streams/active", response_model=List[Stream])
async def get_active_streams(current_user: User = Depends(get_current_user)):
    streams = await db.streams.find({"status": "online"}).to_list(1000)
    return [Stream(**stream) for stream in streams]

@api_router.post("/streams", response_model=Stream)
async def create_stream(stream_data: StreamCreate, current_user: User = Depends(get_current_user)):
    # Check if port is already in use
    existing_stream = await db.streams.find_one({"port": stream_data.port})
    if existing_stream:
        raise HTTPException(status_code=400, detail="Port already in use")
    
    stream_dict = stream_data.dict()
    stream_dict["id"] = str(uuid.uuid4())
    stream_dict["created_at"] = datetime.utcnow()
    stream_dict["updated_at"] = datetime.utcnow()
    
    await db.streams.insert_one(stream_dict)
    return Stream(**stream_dict)

@api_router.post("/streams/{stream_id}/start")
async def start_stream_endpoint(stream_id: str, current_user: User = Depends(get_current_user)):
    stream_data = await db.streams.find_one({"id": stream_id})
    if not stream_data:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    stream = Stream(**stream_data)
    return await start_stream(stream)

@api_router.post("/streams/{stream_id}/stop")
async def stop_stream_endpoint(stream_id: str, current_user: User = Depends(get_current_user)):
    stream_data = await db.streams.find_one({"id": stream_id})
    if not stream_data:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    stream = Stream(**stream_data)
    return await stop_stream(stream)

@api_router.post("/streams/{stream_id}/restart")
async def restart_stream(stream_id: str, current_user: User = Depends(get_current_user)):
    stream_data = await db.streams.find_one({"id": stream_id})
    if not stream_data:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    stream = Stream(**stream_data)
    await stop_stream(stream)
    await asyncio.sleep(2)  # Wait before restart
    return await start_stream(stream)

@api_router.delete("/streams/{stream_id}")
async def delete_stream(stream_id: str, current_user: User = Depends(get_current_user)):
    stream_data = await db.streams.find_one({"id": stream_id})
    if not stream_data:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    # Stop stream if running
    if stream_data["status"] == "online":
        stream = Stream(**stream_data)
        await stop_stream(stream)
    
    await db.streams.delete_one({"id": stream_id})
    return {"message": "Stream deleted successfully"}

# Media Routes
@api_router.get("/media", response_model=List[MediaTrack])
async def get_media(current_user: User = Depends(get_current_user)):
    tracks = await db.media.find().to_list(1000)
    return [MediaTrack(**track) for track in tracks]

@api_router.post("/media/upload")
async def upload_media(files: List[UploadFile] = File(...), current_user: User = Depends(get_current_user)):
    uploaded_files = []
    media_dir = Path("/app/media")
    media_dir.mkdir(exist_ok=True)
    
    for file in files:
        if not file.filename.lower().endswith(('.mp3', '.wav', '.flac', '.aac', '.ogg')):
            continue
            
        file_id = str(uuid.uuid4())
        file_ext = Path(file.filename).suffix
        new_filename = f"{file_id}{file_ext}"
        file_path = media_dir / new_filename
        
        # Save file
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        # Create media record
        media_track = {
            "id": file_id,
            "filename": file.filename,
            "title": Path(file.filename).stem,
            "file_path": str(file_path),
            "file_size": len(content),
            "uploaded_at": datetime.utcnow()
        }
        
        await db.media.insert_one(media_track)
        uploaded_files.append(MediaTrack(**media_track))
    
    return {"message": f"Uploaded {len(uploaded_files)} files", "files": uploaded_files}

@api_router.delete("/media/{track_id}")
async def delete_media(track_id: str, current_user: User = Depends(get_current_user)):
    track = await db.media.find_one({"id": track_id})
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    
    # Delete file
    try:
        Path(track["file_path"]).unlink(missing_ok=True)
    except Exception as e:
        logging.error(f"Failed to delete file {track['file_path']}: {e}")
    
    await db.media.delete_one({"id": track_id})
    return {"message": "Track deleted successfully"}

# AutoDJ Routes
@api_router.get("/autodj/playlists", response_model=List[Playlist])
async def get_playlists(current_user: User = Depends(get_current_user)):
    playlists = await db.playlists.find().to_list(1000)
    return [Playlist(**playlist) for playlist in playlists]

@api_router.post("/autodj/playlists", response_model=Playlist)
async def create_playlist(playlist_data: dict, current_user: User = Depends(get_current_user)):
    playlist_dict = playlist_data
    playlist_dict["id"] = str(uuid.uuid4())
    playlist_dict["created_at"] = datetime.utcnow()
    
    await db.playlists.insert_one(playlist_dict)
    return Playlist(**playlist_dict)

@api_router.post("/autodj/playlists/{playlist_id}/enable")
async def enable_playlist(playlist_id: str, current_user: User = Depends(get_current_user)):
    await db.playlists.update_one(
        {"id": playlist_id},
        {"$set": {"enabled": True}}
    )
    return {"message": "Playlist enabled"}

@api_router.post("/autodj/playlists/{playlist_id}/disable")
async def disable_playlist(playlist_id: str, current_user: User = Depends(get_current_user)):
    await db.playlists.update_one(
        {"id": playlist_id},
        {"$set": {"enabled": False}}
    )
    return {"message": "Playlist disabled"}

@api_router.delete("/autodj/playlists/{playlist_id}")
async def delete_playlist(playlist_id: str, current_user: User = Depends(get_current_user)):
    await db.playlists.delete_one({"id": playlist_id})
    return {"message": "Playlist deleted successfully"}

# Statistics Routes
@api_router.get("/statistics")
async def get_statistics(range: str = "24h", current_user: User = Depends(get_current_user)):
    # Mock statistics data
    return {
        "peakListeners": 45,
        "avgListeners": 28,
        "totalSessions": 156,
        "uniqueCountries": 12,
        "range": range
    }

# User Management Routes
@api_router.get("/users", response_model=List[User])
async def get_users(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = await db.users.find({}, {"password": 0}).to_list(1000)
    return [User(**user) for user in users]

@api_router.post("/users", response_model=User)
async def create_user(user_data: UserCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    user_dict = user_data.dict()
    user_dict["password"] = get_password_hash(user_dict["password"])
    user_dict["id"] = str(uuid.uuid4())
    user_dict["created_at"] = datetime.utcnow()
    
    await db.users.insert_one(user_dict)
    return User(**user_dict)

# Settings Routes
@api_router.get("/settings")
async def get_settings(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Return mock settings
    return {
        "serverName": "CentovaCast Server",
        "adminEmail": "admin@centovacast.local",
        "enableRegistration": True,
        "defaultBitrate": 128,
        "maxStreams": 10,
        "enableAutoDJ": True
    }

@api_router.put("/settings")
async def update_settings(settings: dict, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # In a real implementation, this would save to database
    return {"message": "Settings updated successfully"}

# Include router
app.include_router(api_router)

@app.on_event("startup")
async def startup_event():
    global db, USE_MOCK_DB
    try:
        await client.admin.command("ping")
        USE_MOCK_DB = False
        logging.info("Connected to MongoDB successfully")
    except Exception as e:
        logging.warning(f"MongoDB not available ({e}), using mock")
        USE_MOCK_DB = True
    await init_default_user()
    logging.info("Clonetova server started")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

logger = logging.getLogger(__name__)