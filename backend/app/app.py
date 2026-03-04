import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

load_dotenv()

CLIENT_URL = os.getenv("CLIENT_URL", "http://localhost:5173")

app = FastAPI(
    title="SynaptiScan Backend",
    description="SynaptiScan Backend API",
    version="1.0.0",
)

origins = [
    CLIENT_URL,
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

from app.api import auth, ingestion, dashboard
from app.db.database import engine, Base
from app.db import models  

# Create all database tables on startup (safe to call multiple times)
Base.metadata.create_all(bind=engine)

@app.get("/")
def read_root():
    return JSONResponse({"message": "Server is Live"}, status_code=200)

app.include_router(auth.router, prefix="/api")
app.include_router(ingestion.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")