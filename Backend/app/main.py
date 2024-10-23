# FastAPI backend

# import os
# import logging
# import shutil
# import zipfile
# from fastapi import FastAPI, UploadFile, File, HTTPException
# from fastapi.responses import FileResponse
# from contextlib import asynccontextmanager
# from app.utils import process_images, cluster_images, organize_photos
# from fastapi.middleware.cors import CORSMiddleware
# import tempfile
# from typing import List

# # Set up logging
# logging.basicConfig(level=logging.INFO)
# logger = logging.getLogger(__name__)

# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     logger.info("Starting up...")
#     yield
#     logger.info("Shutting down...")
#     cleanup()

# app = FastAPI(lifespan=lifespan)

# # Constants for temp directories and file size limit
# TEMP_UPLOAD_DIR = "temp_uploads"
# TEMP_ORGANIZED_DIR = "temp_organized"
# MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:5175"],
#     allow_credentials=True,
#     allow_methods=["*"],  # Allows all methods
#     allow_headers=["*"],  # Allows all headers
# )

# @app.get("/")
# async def home():
#     return {"message": "Welcome to the Photo Album API!"}

  
# @app.post("/api/upload-and-organize")
# async def upload_and_organize(files: List[UploadFile] = File(...)):
#     # logger.info(f"Received {len(files)} files")
#     logger.info(f"Received request to /api/upload-and-organize")
#     logger.info(f"Number of files received: {len(files)}")
#     for file in files:
#         logger.info(f"File: {file.filename}, Size: {file.size}")

#     try:
#         # Skapa en tillfällig mapp för uppladdningar
#         temp_dir = tempfile.mkdtemp()
#         file_paths = []
        
#         if not files:
#             raise HTTPException(status_code=400, detail="No files uploaded")
        
#         # Spara uppladdade filer till den tillfälliga mappen
#         for file in files:
#             logger.info(f"Received file: {file.filename}")
#             if file.size > MAX_FILE_SIZE:
#                 raise HTTPException(status_code=400, detail=f"File {file.filename} is too large. Max size is 10 MB.")
            
#             file_path = os.path.join(temp_dir, file.filename)
#             with open(file_path, "wb") as buffer:
#                 shutil.copyfileobj(file.file, buffer)
#             file_paths.append(file_path)

#         # Anropa process_images som kan hantera både filer och mappar
#         features, file_paths = process_images(temp_dir)

#         # Klustra bilderna baserat på funktionsvektorerna
#         clusters = cluster_images(file_paths, features)

#         # Organisera fotona i ett albumformat
#         organized_photos = organize_photos(file_paths, clusters)

#         # Skapa en förhandsvisning av de organiserade bilderna
#         organized_photo_preview = []
#         for date, best_photo, alternatives in organized_photos:
#             organized_photo_preview.append({
#                 'date': date.isoformat() if date else None,
#                 'best_photo': best_photo,
#                 'alternatives': alternatives
#             })

#         # Returnera förhandsvisningen och den temporära katalogen för framtida nedladdningar
#         return {"preview": organized_photo_preview, "temp_dir": temp_dir}

#     except Exception as e:
#         # Logga hela felmeddelandet för felsökning
#         logger.error(f"Error occurred while processing the photos: {str(e)}")
#         raise HTTPException(status_code=500, detail="An error occurred while processing the photos.")


# # Endpoint for downloading the organized album as a zip file
# @app.post("/api/download-album")
# async def download_album(temp_dir: str):
#     if not os.path.exists(temp_dir):
#         raise HTTPException(status_code=400, detail="Temporary directory does not exist.")

#     try:
#         # Create a zip file of the organized photos
#         memory_file = tempfile.TemporaryFile()
#         with zipfile.ZipFile(memory_file, 'w') as zf:
#             for root, _, files in os.walk(temp_dir):
#                 for file in files:
#                     file_path = os.path.join(root, file)
#                     zf.write(file_path, os.path.basename(file_path))

#         memory_file.seek(0)

#         # Cleanup the temp directory
#         shutil.rmtree(temp_dir, ignore_errors=True)

#         return FileResponse(memory_file, media_type='application/zip', filename="organized_photo_album.zip")
    
#     except Exception as e:
#         logger.error(f"Error creating zip file: {str(e)}")
#         raise HTTPException(status_code=500, detail="An error occurred while creating the zip file.")

# # Health check route
# @app.get("/health")
# async def health_check():
#     return {"status": "healthy"}

# # Cleanup function
# def cleanup():
#     try:
#         shutil.rmtree(TEMP_UPLOAD_DIR, ignore_errors=True)
#         shutil.rmtree(TEMP_ORGANIZED_DIR, ignore_errors=True)
#         if os.path.exists("organized_photos.zip"):
#             os.remove("organized_photos.zip")
#         logger.info("Cleanup completed successfully.")
#     except Exception as e:
#         logger.error(f"Error during cleanup: {str(e)}")





# Flask backend

import os
import logging
import shutil
import zipfile
import tempfile
from flask import Flask, request, jsonify, send_file, abort
from flask_cors import CORS
from werkzeug.utils import secure_filename
from app.utils import process_images, cluster_images, organize_photos
from app.tasks import process_image_task
from app.celery_app import app

# Flask app setup
# app = Flask(__name__)
# CORS(app, resources={r"/*": {"origins": "http://localhost:5175"}})

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# app.config.update(
#     CELERY_BROKER_URL='redis://localhost:6379/0',
#     CELERY_RESULT_BACKEND='redis://localhost:6379/0'
# )

# celery = make_celery(app)

# Constants for temp directories and file size limit
TEMP_UPLOAD_DIR = "temp_uploads"
TEMP_ORGANIZED_DIR = "temp_organized"
# MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
# Set the file size limit and stream uploads
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024 * 1024  # 10 GB limit (for example)

# Create temp folder if it doesn't exist
if not os.path.exists(TEMP_UPLOAD_DIR):
    os.makedirs(TEMP_UPLOAD_DIR)

@app.route('/process_images_route', methods=['POST'])
def process_images_route():
    image_paths = get_image_paths_from_request()  # Parse request to get file paths
    task_ids = []

    # Offload each image processing task to Celery
    for image_path in image_paths:
        task = process_image_task.delay(image_path)
        task_ids.append(task.id)

    return jsonify({"task_ids": task_ids}), 202


def get_image_paths_from_request():
    """
    Extracts and saves uploaded images from the request and returns a list of file paths.
    """
    if 'files' not in request.files:
        abort(400, description="No files part in the request")

    files = request.files.getlist('files')
    
    if not files:
        abort(400, description="No files uploaded")

    temp_dir = tempfile.mkdtemp()  # Create a temporary directory to store uploaded files
    file_paths = []

    for file in files:
        filename = secure_filename(file.filename)  # Ensure safe filenames
        if not filename:
            continue  # Skip files without a filename

        file_path = os.path.join(temp_dir, filename)
        file.save(file_path)  # Save the uploaded file
        file_paths.append(file_path)  # Store the path to the saved file

    return file_paths


# Create endpoint for uploading and organizing photos
@app.route('/api/upload-and-organize', methods=['POST'])
def upload_and_organize():
    logger.info(f"Received request to /api/upload-and-organize")

    # Check if files are in the request
    if 'files' not in request.files:
        return abort(400, description="No files uploaded")
    
    files = request.files.getlist('files')

    # Create a temporary directory for uploaded files
    temp_dir = tempfile.mkdtemp()
    file_paths = []
    
    logger.info(f"Number of files received: {len(files)}")

    for file in files:
        filename = secure_filename(file.filename)
        file_path = os.path.join(temp_dir, filename)

        # Initialize a variable to keep track of the total file size
        total_size = 0

        # Streaming the file to disk and checking size while streaming
        with open(file_path, 'wb') as f:
            for chunk in file.stream:
                total_size += len(chunk)
                if total_size > app.config['MAX_CONTENT_LENGTH']:
                    abort(400, description=f"File {filename} is too large. Max size is 10 GB.")
                f.write(chunk)

        logger.info(f"Saved file: {file_path}")
        file_paths.append(file_path)

        # # Check file size
        # if len(file.read()) > app.config['MAX_CONTENT_LENGTH']:
        #     file.seek(0)  # Reset the file pointer after reading
        #     abort(400, description=f"File {filename} is too large. Max size is 10 MB.")
        
        # file.seek(0)  # Reset the file pointer after the size check
        # file.save(file_path)  # Save file
        # file_paths.append(file_path)
        # logger.info(f"Saved file: {file_path}")

    try:
        # Process images (this handles both files and directories)
        features, file_paths = process_images(temp_dir)

        # Cluster images based on features
        clusters = cluster_images(file_paths, features)

        # Organize photos into album structure
        organized_photos = organize_photos(file_paths, clusters)

        # Prepare the organized preview for the response
        organized_photo_preview = []
        for date, best_photo, alternatives, is_best in organized_photos:
            organized_photo_preview.append({
                'date': date.isoformat() if date else None,
                'best_photo': best_photo,
                'alternatives': alternatives,
                'is_best': is_best
            })

        # Return the organized preview and the temp directory for future download
        return jsonify({"preview": organized_photo_preview, "temp_dir": temp_dir})
    
    except Exception as e:
        logger.error(f"Error occurred while processing the photos: {str(e)}")
        return abort(500, description="An error occurred while processing the photos.")


@app.route('/api/update-best-photo', methods=['POST'])
def update_best_photo():
    try:
        data = request.json
        updated_photos = data.get('updatedPhotos')
        temp_dir = data.get('tempDir')

        # Apply changes to the saved files in temp_dir
        for photo in updated_photos:
            # Logic to update the files or best photo designation in temp_dir
            pass

        return jsonify({"message": "Best photos updated successfully"}), 200
    except Exception as e:
        logger.error(f"Error updating best photo: {str(e)}")
        return abort(500, description="An error occurred while updating the best photo.")


# Endpoint for downloading the organized album as a zip file
@app.route('/api/download-album', methods=['POST'])
def download_album():
    data = request.get_json()
    temp_dir = data.get("temp_dir", None)

    if not temp_dir or not os.path.exists(temp_dir):
        return abort(400, description="Temporary directory does not exist.")

    try:
        # Create a zip file with organized photos
        memory_file = tempfile.TemporaryFile()
        with zipfile.ZipFile(memory_file, 'w') as zf:
            for root, _, files in os.walk(temp_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    zf.write(file_path, os.path.basename(file_path))

        memory_file.seek(0)

        # Cleanup the temp directory after zipping
        shutil.rmtree(temp_dir, ignore_errors=True)

        # Return the zip file as a response
        return send_file(memory_file, as_attachment=True, download_name="organized_photo_album.zip")
    
    except Exception as e:
        logger.error(f"Error creating zip file: {str(e)}")
        return abort(500, description="An error occurred while creating the zip file.")


# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})


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


if __name__ == "__main__":
    # Start the Flask app
    app.run(debug=True, port=8000)
