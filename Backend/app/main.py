import os
import logging
import shutil
import zipfile
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
from app.utils import process_images, cluster_images, organize_photos
from fastapi.middleware.cors import CORSMiddleware
import tempfile

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up...")
    yield
    logger.info("Shutting down...")
    cleanup()

app = FastAPI(lifespan=lifespan)

# Constants for temp directories and file size limit
TEMP_UPLOAD_DIR = "temp_uploads"
TEMP_ORGANIZED_DIR = "temp_organized"
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5175", "http://127.0.0.1:5175"],  # Add your frontend origin here
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def home():
    return {"message": "Welcome to the Photo Album API!"}


@app.post("/api/upload-and-organize")
async def upload_and_organize(files: list[UploadFile] = File(...)):
    try:
        # Skapa en tillfällig mapp för uppladdningar
        temp_dir = tempfile.mkdtemp()
        file_paths = []

        if not files:
            raise HTTPException(status_code=400, detail="No files uploaded")
        
        # Spara uppladdade filer till den tillfälliga mappen
        for file in files:
            logger.info(f"Received file: {file.filename}")
            if file.size > MAX_FILE_SIZE:
                raise HTTPException(status_code=400, detail=f"File {file.filename} is too large. Max size is 10 MB.")
            
            file_path = os.path.join(temp_dir, file.filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            file_paths.append(file_path)

        # Anropa process_images som kan hantera både filer och mappar
        features, file_paths = process_images(temp_dir)

        # Klustra bilderna baserat på funktionsvektorerna
        clusters = cluster_images(file_paths, features)

        # Organisera fotona i ett albumformat
        organized_photos = organize_photos(file_paths, clusters)

        # Skapa en förhandsvisning av de organiserade bilderna
        organized_photo_preview = []
        for date, best_photo, alternatives, is_best in organized_photos:
            organized_photo_preview.append({
                'date': date.isoformat() if date else None,
                'best_photo': best_photo,
                'alternatives': alternatives
            })

        # Returnera förhandsvisningen och den temporära katalogen för framtida nedladdningar
        return {"preview": organized_photo_preview, "temp_dir": temp_dir}

    except Exception as e:
        # Logga hela felmeddelandet för felsökning
        logger.error(f"Error occurred while processing the photos: {str(e)}")
        raise HTTPException(status_code=500, detail="An error occurred while processing the photos.")


# Endpoint for downloading the organized album as a zip file
@app.post("/api/download-album")
async def download_album(temp_dir: str):
    if not os.path.exists(temp_dir):
        raise HTTPException(status_code=400, detail="Temporary directory does not exist.")

    try:
        # Create a zip file of the organized photos
        memory_file = tempfile.TemporaryFile()
        with zipfile.ZipFile(memory_file, 'w') as zf:
            for root, _, files in os.walk(temp_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    zf.write(file_path, os.path.basename(file_path))

        memory_file.seek(0)

        # Cleanup the temp directory
        shutil.rmtree(temp_dir, ignore_errors=True)

        return FileResponse(memory_file, media_type='application/zip', filename="organized_photo_album.zip")
    
    except Exception as e:
        logger.error(f"Error creating zip file: {str(e)}")
        raise HTTPException(status_code=500, detail="An error occurred while creating the zip file.")

# Health check route
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Cleanup function
def cleanup():
    try:
        shutil.rmtree(TEMP_UPLOAD_DIR, ignore_errors=True)
        shutil.rmtree(TEMP_ORGANIZED_DIR, ignore_errors=True)
        if os.path.exists("organized_photos.zip"):
            os.remove("organized_photos.zip")
        logger.info("Cleanup completed successfully.")
    except Exception as e:
        logger.error(f"Error during cleanup: {str(e)}")