import os
import logging
from contextlib import asynccontextmanager
import shutil
import zipfile
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from .utils import process_image, cluster_images, organize_photos

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

TEMP_UPLOAD_DIR = "temp_uploads"
TEMP_ORGANIZED_DIR = "temp_organized"
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

@app.post("/upload")
async def upload_photos(files: list[UploadFile] = File(...)):
    try:
        os.makedirs(TEMP_UPLOAD_DIR, exist_ok=True)
        file_paths = []
        for file in files:
            if file.size > MAX_FILE_SIZE:
                raise HTTPException(status_code=400, detail=f"File {file.filename} is too large. Max size is 10 MB.")
            
            file_path = os.path.join(TEMP_UPLOAD_DIR, file.filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            file_paths.append(file_path)
        
        features = [process_image(file_path) for file_path in file_paths]
        clusters = cluster_images(features)
        organized_structure = organize_photos(file_paths, clusters)
        
        zip_path = create_zip_from_structure(organized_structure)
        
        return FileResponse(zip_path, filename="organized_photos.zip")
    except Exception as e:
        logger.error(f"Error processing photos: {str(e)}")
        raise HTTPException(status_code=500, detail="An error occurred while processing the photos.")

def create_zip_from_structure(structure):
    try:
        os.makedirs(TEMP_ORGANIZED_DIR, exist_ok=True)
        for folder, files in structure.items():
            folder_path = os.path.join(TEMP_ORGANIZED_DIR, folder)
            os.makedirs(folder_path, exist_ok=True)
            for file in files:
                shutil.copy2(file, folder_path)
        
        zip_path = "organized_photos.zip"
        with zipfile.ZipFile(zip_path, 'w') as zipf:
            for root, _, files in os.walk(TEMP_ORGANIZED_DIR):
                for file in files:
                    zipf.write(os.path.join(root, file), 
                               os.path.relpath(os.path.join(root, file), TEMP_ORGANIZED_DIR))
        
        return zip_path
    except Exception as e:
        logger.error(f"Error creating zip file: {str(e)}")
        raise HTTPException(status_code=500, detail="An error occurred while creating the zip file.")

def cleanup():
    try:
        shutil.rmtree(TEMP_UPLOAD_DIR, ignore_errors=True)
        shutil.rmtree(TEMP_ORGANIZED_DIR, ignore_errors=True)
        if os.path.exists("organized_photos.zip"):
            os.remove("organized_photos.zip")
        logger.info("Cleanup completed successfully.")
    except Exception as e:
        logger.error(f"Error during cleanup: {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "healthy"}