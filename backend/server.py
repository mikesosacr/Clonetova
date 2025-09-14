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

# Load environment
from dotenv import load_dotenv
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

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
    email: EmailStr
    role: str = "user"  # admin, dj, user
    status: str = "active"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "user"

class UserLogin(BaseModel):
    email: EmailStr
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
    result = await db.streams.aggregate(pipeline).to_list(1)
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

# Include router
app.include_router(api_router)

@app.on_event("startup")
async def startup_event():
    await init_default_user()
    logging.info("CentovaCast server started")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)