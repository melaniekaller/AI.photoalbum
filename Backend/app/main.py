import os
import uuid
import logging
import shutil
import zipfile
import tempfile
from flask import Flask, request, jsonify, send_file, abort, send_from_directory, current_app
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

# Create placeholder images
# create_placeholder_images()

@app.route('/', methods=['GET'])
def index():
    return jsonify({"message": "Welcome to the AI Photo Album Backend!"})

@app.route('/uploads/<path:filename>')
def serve_file(filename):
    """Serve files from the TEMP_UPLOAD_DIR"""
    try:
        # Extract the directory and actual filename
        directory = os.path.dirname(filename)
        base_filename = os.path.basename(filename)
        
        # Construct the full directory path
        full_dir_path = os.path.join(os.getcwd(), TEMP_UPLOAD_DIR, directory)
        
        logger.info(f"Attempting to serve file: {os.path.join(full_dir_path, base_filename)}")
        
        if not os.path.exists(os.path.join(full_dir_path, base_filename)):
            logger.error(f"File not found: {os.path.join(full_dir_path, base_filename)}")
            return abort(404)

        response = send_from_directory(full_dir_path, base_filename)
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:5175'
        response.headers['Cache-Control'] = 'no-cache'
        return response
    except Exception as e:
        logger.error(f"Error serving file {filename}: {str(e)}")
        return abort(404)

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

    if 'files' not in request.files:
        return abort(400, description="No files uploaded")
    
    files = request.files.getlist('files')
    
    # Create a unique directory for this session's uploaded files
    unique_dir = str(uuid.uuid4())
    upload_dir = os.path.join(TEMP_UPLOAD_DIR, unique_dir)
    logger.info(f"Creating upload directory: {upload_dir}")
    
    os.makedirs(upload_dir, exist_ok=True)
    logger.info(f"Directory created: {os.path.exists(upload_dir)}")

    # Log the current directory structure
    logger.info(f"Current working directory: {os.getcwd()}")
    logger.info(f"TEMP_UPLOAD_DIR contents: {os.listdir(TEMP_UPLOAD_DIR)}")

    file_paths = []
    logger.info(f"Number of files received: {len(files)}")

    for file in files:
        filename = secure_filename(file.filename)
        file_path = os.path.join(upload_dir, filename)
        
        # Save the file
        file.save(file_path)
        logger.info(f"Saved file to: {file_path}")
        
        # Verify file exists and is readable
        if os.path.exists(file_path):
            file_paths.append(file_path)
            logger.info(f"File saved and verified: {file_path}")
        else:
            logger.error(f"Failed to save file: {file_path}")

    try:
        # Process images
        features, file_paths = process_images(upload_dir)
        
        # Cluster images
        clusters = cluster_images(file_paths, features)
        
        # Organize photos
        organized_photos = organize_photos(file_paths, clusters)
        
        # Prepare the response
        organized_preview = []
        for date, best_photo, alternatives, is_best in organized_photos:
            organized_preview.append({
                'date': date.isoformat() if date else None,
                'best_photo': os.path.basename(best_photo),
                'alternatives': [os.path.basename(alt) for alt in alternatives],
                'is_best': is_best
            })
        
        logger.info(f"Successfully organized {len(organized_preview)} photos")
        return jsonify({"preview": organized_preview, "temp_dir": unique_dir})

    except Exception as e:
        logger.error(f"Error processing photos: {str(e)}")
        return abort(500, description="Error processing photos")


@app.route('/api/update-best-photo', methods=['POST'])
def update_best_photo():
    try:
        # Get the updated photo information from the request
        data = request.json
        updated_photos = data.get('updatedPhotos')
        temp_dir = data.get('tempDir')

        # Ensure that temp_dir exists
        if not os.path.exists(temp_dir):
            return abort(400, description="Temporary directory not found")

        # Apply changes to the saved files in temp_dir
        for photo in updated_photos:
            best_photo_path = os.path.join(temp_dir, os.path.basename(photo['best_photo']))
            alternatives = photo['alternatives']
            is_best = photo.get('is_best', False)

            # Ensure the best photo file exists
            if not os.path.exists(best_photo_path):
                logger.error(f"Best photo {best_photo_path} does not exist.")
                continue

            # Create a folder to store the best photo and its alternatives, if necessary
            cluster_dir = os.path.join(temp_dir, f"cluster_{updated_photos.index(photo)}")
            if not os.path.exists(cluster_dir):
                os.makedirs(cluster_dir)

            # Move the best photo to the top level or mark it in the cluster directory
            best_photo_name = f"best_{os.path.basename(best_photo_path)}"
            best_photo_dest = os.path.join(cluster_dir, best_photo_name)

            # Copy or move the best photo to the cluster directory
            shutil.copy(best_photo_path, best_photo_dest)

            # Handle alternatives
            for alt in alternatives:
                alt_photo_path = os.path.join(temp_dir, os.path.basename(alt))
                if os.path.exists(alt_photo_path):
                    shutil.copy(alt_photo_path, os.path.join(cluster_dir, os.path.basename(alt_photo_path)))

        return jsonify({"message": "Best photos updated successfully"}), 200

    except Exception as e:
        logger.error(f"Error updating best photo: {str(e)}")
        return abort(500, description="An error occurred while updating the best photo.")

# Endpoint for downloading the organized album as a zip file
@app.route('/api/download-album', methods=['POST'])
def download_album():
    try:
        data = request.get_json()
        temp_dir = data.get("temp_dir")
        
        if not temp_dir:
            logger.error("No temp_dir provided in request")
            return abort(400, description="No temporary directory specified")

        # Construct the full path to the temp directory
        full_temp_dir = os.path.join(TEMP_UPLOAD_DIR, temp_dir)
        
        if not os.path.exists(full_temp_dir):
            logger.error(f"Directory not found: {full_temp_dir}")
            return abort(400, description="Temporary directory does not exist")

        logger.info(f"Creating zip file from directory: {full_temp_dir}")

        # Create a zip file with organized photos
        memory_file = tempfile.NamedTemporaryFile(delete=False)
        with zipfile.ZipFile(memory_file, 'w') as zf:
            # Walk through the directory
            for root, _, files in os.walk(full_temp_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    # Add file to zip with relative path
                    arcname = os.path.relpath(file_path, full_temp_dir)
                    logger.info(f"Adding file to zip: {file_path} as {arcname}")
                    zf.write(file_path, arcname)

        memory_file.seek(0)
        
        logger.info("Zip file created successfully")

        # Return the zip file
        response = send_file(
            memory_file.name,
            mimetype='application/zip',
            as_attachment=True,
            download_name=f"photo_album_{temp_dir}.zip"
        )

        # Clean up after sending
        @response.call_on_close
        def cleanup():
            logger.info("Cleaning up temporary zip file")
            try:
                os.unlink(memory_file.name)
            except Exception as e:
                logger.error(f"Error cleaning up zip file: {e}")

        return response

    except Exception as e:
        logger.error(f"Error creating zip file: {str(e)}")
        return abort(500, description=f"Error creating zip file: {str(e)}")


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


# Add this new route for static images
@app.route('/static/images/<filename>')
def serve_static(filename):
    try:
        static_dir = os.path.join(current_app.root_path, 'static', 'images')
        if not os.path.exists(static_dir):
            os.makedirs(static_dir)
            create_placeholder_images()
        
        if not os.path.exists(os.path.join(static_dir, filename)):
            logger.warning(f"Placeholder image {filename} not found, creating it")
            create_placeholder_images()
        
        return send_from_directory(
            static_dir,
            filename,
            cache_timeout=0
        )
    except Exception as e:
        logger.error(f"Error serving static file {filename}: {str(e)}")
        return abort(404)


@app.route('/debug/files/<path:directory>')
def debug_files(directory):
    """Debug endpoint to check file structure"""
    try:
        # List all directories in TEMP_UPLOAD_DIR
        all_dirs = os.listdir(TEMP_UPLOAD_DIR)
        
        # Get the full path we're trying to check
        full_dir_path = os.path.join(os.getcwd(), TEMP_UPLOAD_DIR, directory)
        
        return jsonify({
            "requested_directory": directory,
            "full_path": full_dir_path,
            "temp_upload_dir": TEMP_UPLOAD_DIR,
            "all_directories": all_dirs,
            "exists": os.path.exists(full_dir_path),
            "current_working_dir": os.getcwd(),
            "files": [f for f in os.listdir(TEMP_UPLOAD_DIR)] if os.path.exists(TEMP_UPLOAD_DIR) else []
        })
    except Exception as e:
        return jsonify({
            "error": str(e),
            "temp_upload_dir": TEMP_UPLOAD_DIR,
            "current_working_dir": os.getcwd(),
            "exists": os.path.exists(TEMP_UPLOAD_DIR)
        })


if __name__ == "__main__":
    # Start the Flask app
    app.run(debug=True, port=8000)
