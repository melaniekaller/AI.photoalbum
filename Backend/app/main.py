import os
import uuid
import logging
import shutil
import zipfile
import tempfile
import json
from flask import Flask, request, jsonify, send_file, abort, send_from_directory, current_app
from flask_cors import CORS
from werkzeug.utils import secure_filename
from app.utils import process_images, cluster_images, organize_photos
from app.tasks import process_image_task
from app.celery_app import app
from PIL import Image, ImageDraw, ImageFont

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants for temp directories
TEMP_UPLOAD_DIR = r"C:\Users\melan\Documents\Nackademin\ML 2\Photoalbum\AI.photoalbum\Backend\temp_uploads"
TEMP_ORGANIZED_DIR = "temp_organized"

# Create temp folder if it doesn't exist
if not os.path.exists(TEMP_UPLOAD_DIR):
    os.makedirs(TEMP_UPLOAD_DIR)

print(app.url_map)


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
    image_paths = get_image_paths_from_request()
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

    temp_dir = tempfile.mkdtemp()
    file_paths = []

    for file in files:
        filename = secure_filename(file.filename)
        if not filename:
            continue

        file_path = os.path.join(temp_dir, filename)
        file.save(file_path)
        file_paths.append(file_path)

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
        
        # Save organized photos to updated_photos.json
        updated_photos_path = os.path.join(upload_dir, 'updated_photos.json')
        with open(updated_photos_path, 'w') as f:
            json.dump(organized_preview, f)
        logger.info(f"Successfully saved updated_photos.json to {updated_photos_path}")

        logger.info(f"Successfully organized {len(organized_preview)} photos")
        return jsonify({"preview": organized_preview, "temp_dir": unique_dir})

    except Exception as e:
        logger.error(f"Error processing photos: {str(e)}")
        return abort(500, description="Error processing photos")

@app.route('/api/update-best-photo', methods=['POST'])
def update_best_photo():
    logger.info("update_best_photo endpoint triggered")
    logger.info(f"Headers: {request.headers}")
    logger.info(f"Content-Type: {request.content_type}")
    logger.info(f"Request Data: {request.get_data(as_text=True)}")

    try:
        # Extract form data
        form_keys = list(request.form.keys())
        logger.info(f"Form Data Keys: {form_keys}")
        
        temp_dir = request.form.get('tempDir')
        updated_photos = request.form.get('updatedPhotos')

        # Log the extracted form data for debugging
        logger.info(f"Extracted tempDir: {temp_dir}")
        logger.info(f"Extracted updatedPhotos: {updated_photos}")

        if not temp_dir or not updated_photos:
            logger.error("Missing tempDir or updatedPhotos in the request.")
            return abort(400, description="Missing tempDir or updatedPhotos")

        # Parse updated_photos from JSON string
        try:
            updated_photos = json.loads(updated_photos)
            logger.info(f"Parsed updatedPhotos: {updated_photos}")
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse updatedPhotos as JSON: {str(e)}")
            return abort(400, description="Invalid JSON format in updatedPhotos")

        full_temp_dir = os.path.join(TEMP_UPLOAD_DIR, temp_dir)
        if not os.path.exists(full_temp_dir):
            logger.error(f"Temporary directory not found: {full_temp_dir}")
            return abort(400, description="Temporary directory not found")

        # Process each photo in the updated data
        for idx, photo in enumerate(updated_photos):
            try:
                best_photos = photo.get('best_photos', [])
                alternatives = photo.get('alternatives', [])

                logger.info(f"Processing cluster {idx} with {len(best_photos)} best photos and {len(alternatives)} alternatives.")

                # Validate filenames
                invalid_files = [file for file in best_photos + alternatives \
                                 if not os.path.exists(os.path.join(full_temp_dir, os.path.basename(file)))]
                if invalid_files:
                    logger.warning(f"Files not found: {invalid_files}")

                # Create cluster directory
                cluster_dir = os.path.join(full_temp_dir, f"cluster_{idx}")
                os.makedirs(cluster_dir, exist_ok=True)

                # Process best photos
                for best_photo in best_photos:
                    source_path = os.path.join(full_temp_dir, os.path.basename(best_photo))
                    if os.path.exists(source_path):
                        dest_name = f"best_{os.path.basename(best_photo)}"
                        dest_path = os.path.join(cluster_dir, dest_name)
                        shutil.copy2(source_path, dest_path)
                        logger.info(f"Copied best photo to {dest_path}")
                    else:
                        logger.warning(f"Best photo not found: {source_path}")

                # Process alternatives
                for alt in alternatives:
                    if alt not in best_photos:
                        source_path = os.path.join(full_temp_dir, os.path.basename(alt))
                        if os.path.exists(source_path):
                            dest_path = os.path.join(cluster_dir, os.path.basename(alt))
                            shutil.copy2(source_path, dest_path)
                            logger.info(f"Copied alternative photo to {dest_path}")
                        else:
                            logger.warning(f"Alternative photo not found: {source_path}")

            except Exception as e:
                logger.error(f"Error processing cluster {idx}: {str(e)}")
                continue

        # Save updated photos to updated_photos.json
        updated_photos_path = os.path.join(full_temp_dir, "updated_photos.json")
        with open(updated_photos_path, 'w') as f:
            json.dump(updated_photos, f)
        logger.info(f"Saved updated photos to {updated_photos_path}")

        return jsonify({"message": "Best photos updated successfully"}), 200

    except Exception as e:
        logger.error(f"General error in update_best_photo: {str(e)}")
        return abort(500, description=f"Internal Server Error: {str(e)}")

@app.route('/api/download-album', methods=['GET'])
def download_album():
    temp_dir = request.args.get('tempDir')
    json_path = os.path.join('temp_uploads', temp_dir, 'updated_photos.json')
    
    if not os.path.exists(json_path):
        app.logger.error(f'{json_path} not found')
        return jsonify({'error': 'updated_photos.json not found'}), 400

    try:
        # Extract tempDir from query parameters
        temp_dir = request.args.get('tempDir')
        if not temp_dir:
            logger.error("Missing tempDir parameter")
            return abort(400, description="Missing tempDir parameter")

        full_temp_dir = os.path.join(TEMP_UPLOAD_DIR, temp_dir)
        if not os.path.exists(full_temp_dir):
            logger.error(f"Temporary directory not found: {full_temp_dir}")
            return abort(400, description="Temporary directory not found")

        # Load updated_photos.json
        updated_photos_path = os.path.join(full_temp_dir, "updated_photos.json")
        if not os.path.exists(updated_photos_path):
            logger.error(f"updated_photos.json not found in {full_temp_dir}")
            return abort(400, description="updated_photos.json not found")

        with open(updated_photos_path, 'r') as f:
            updated_photos = json.load(f)

        # Create a zip file
        zip_filename = os.path.join(full_temp_dir, "album.zip")
        with zipfile.ZipFile(zip_filename, 'w') as zipf:
            for photo in updated_photos:
                best_photos = photo.get("best_photos", [])
                if best_photos:
                    # Add selected best photos
                    for best_photo in best_photos:
                        source_path = os.path.join(full_temp_dir, os.path.basename(best_photo))
                        if os.path.exists(source_path):
                            zipf.write(source_path, arcname=os.path.basename(best_photo))
                else:
                    # Add standalone photos
                    best_photo = photo.get("best_photo")
                    if best_photo:
                        source_path = os.path.join(full_temp_dir, os.path.basename(best_photo))
                        if os.path.exists(source_path):
                            zipf.write(source_path, arcname=os.path.basename(best_photo))

        # Return the zip file as a response
        response = send_file(
            zip_filename,
            as_attachment=True,
            mimetype='application/zip',
            download_name=f"photo_album_{temp_dir}.zip"
        )

        # Clean up the temporary directory after sending the response
        @response.call_on_close
        def cleanup_temp_dir():
            cleanup(full_temp_dir)

        return response

    except Exception as e:
        logger.error(f"Error in download_album: {str(e)}")
        return abort(500, description=f"Internal Server Error: {str(e)}")


# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})


# Cleanup function
def cleanup(directory=None):
    try:
        if directory:
            logger.info(f"Attempting to clean up directory: {directory}")
            shutil.rmtree(directory, ignore_errors=True)
            logger.info(f"Cleanup completed for directory: {directory}")
        else:
            logger.info("Attempting general cleanup")
            shutil.rmtree(TEMP_UPLOAD_DIR, ignore_errors=True)
            shutil.rmtree(TEMP_ORGANIZED_DIR, ignore_errors=True)
            if os.path.exists("organized_photos.zip"):
                os.remove("organized_photos.zip")
            logger.info("General cleanup completed successfully.")
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


def create_placeholder_images():
    """
    Creates placeholder images in the static/images directory.
    """
    static_dir = os.path.join(current_app.root_path, 'static', 'images')
    if not os.path.exists(static_dir):
        os.makedirs(static_dir)

    # Example placeholder images
    placeholder_images = ['placeholder1.jpg', 'placeholder2.jpg']

    for image_name in placeholder_images:
        image_path = os.path.join(static_dir, image_name)
        if not os.path.exists(image_path):
            # Create a simple placeholder image (e.g., a blank image or with some text)
            img = Image.new('RGB', (200, 200), color=(73, 109, 137))
            d = ImageDraw.Draw(img)
            d.text((10, 10), "Placeholder", fill=(255, 255, 0))
            img.save(image_path)


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
