import os
import logging
import shutil
import zipfile
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
from .utils import process_image, cluster_images, organize_photos
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


@app.get("/")
async def home():
    return {"message": "Welcome to the Photo Album API!"}

# Upload and organize photos
# @app.post("/api/upload-and-organize")
# async def upload_photos(files: list[UploadFile] = File(...)):
#     try:
#         # Create a temporary directory for uploads
#         temp_dir = tempfile.mkdtemp()
#         file_paths = []

#         # Save uploaded files
#         for file in files:
#             if file.size > MAX_FILE_SIZE:
#                 raise HTTPException(status_code=400, detail=f"File {file.filename} is too large. Max size is 10 MB.")
#             file_path = os.path.join(temp_dir, file.filename)
#             with open(file_path, "wb") as buffer:
#                 shutil.copyfileobj(file.file, buffer)
#             file_paths.append(file_path)

#         # Process images using the AI model
#         features = [process_image(file_path) for file_path in file_paths]

#         # Cluster the images
#         clusters = cluster_images(file_paths, features)

#         # Organize the photos into an album structure
#         organized_photos = organize_photos(file_paths, clusters)

#         # Return a preview of organized photos
#         organized_photo_preview = []
#         for date, best_photo, alternatives, is_best in organized_photos:
#             organized_photo_preview.append({
#                 'date': date.isoformat() if date else None,
#                 'best_photo': best_photo,
#                 'alternatives': alternatives
#             })

#         # Return a preview for the frontend and temp dir for future download
#         return {"preview": organized_photo_preview, "temp_dir": temp_dir}

#     except Exception as e:
#         logger.error(f"Error processing photos: {str(e)}")
#         raise HTTPException(status_code=500, detail="An error occurred while processing the photos.")

@app.post("/api/upload-and-organize")
async def upload_and_organize(files: list[UploadFile] = File(...)):
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
        # Log the full exception message for debugging
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
