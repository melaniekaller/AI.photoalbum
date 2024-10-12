from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from utils import organize_photos, process_image, cluster_images
import os
from werkzeug.utils import secure_filename
import zipfile
import io

app = Flask(__name__)
CORS(app)  # This will enable CORS for all routes

@app.route('/', methods=['GET'])
def home():
    return "Welcome to the Photo Album API!"

@app.route('/api/organized-photos', methods=['GET'])
def get_organized_photos():
    try:
        # Assuming your photos are stored in a 'photos' directory
        photo_directory = 'path/to/your/photos/directory'
        file_paths = [os.path.join(photo_directory, f) for f in os.listdir(photo_directory) if f.endswith(('.jpg', '.jpeg', '.png'))]
        
        # Process images to extract features
        features_list = [process_image(file_path) for file_path in file_paths]
        
        # Cluster images
        clusters = cluster_images(file_paths, features_list)
        
        # Organize photos
        organized_photos = organize_photos(file_paths, clusters)
        
        # Format the data for the frontend
        formatted_data = []
        for date, best_photo, alternatives, is_best in organized_photos:
            formatted_data.append([
                date.isoformat() if date else None,  # Convert date to ISO format string
                best_photo,
                alternatives,
                is_best
            ])
        
        return jsonify(formatted_data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/upload-and-organize', methods=['POST'])
def upload_and_organize():
    if 'image0' not in request.files:
        return jsonify({'error': 'No images provided'}), 400

    # Create a temporary directory to store uploaded images
    temp_dir = 'temp_uploads'
    os.makedirs(temp_dir, exist_ok=True)

    # Save uploaded images
    file_paths = []
    for key, file in request.files.items():
        if file.filename:
            filename = secure_filename(file.filename)
            file_path = os.path.join(temp_dir, filename)
            file.save(file_path)
            file_paths.append(file_path)

    try:
        # Process images to extract features
        features_list = [process_image(file_path) for file_path in file_paths]
        
        # Cluster images
        clusters = cluster_images(file_paths, features_list)
        
        # Organize photos
        organized_photos = organize_photos(file_paths, clusters)
        
        # Create a zip file of the organized images
        memory_file = io.BytesIO()
        with zipfile.ZipFile(memory_file, 'w') as zf:
            for date, best_photo, alternatives, is_best in organized_photos:
                zf.write(best_photo, os.path.basename(best_photo))
                for alt in alternatives:
                    zf.write(alt, os.path.basename(alt))

        memory_file.seek(0)

        # Clean up temporary files
        for file in os.listdir(temp_dir):
            os.remove(os.path.join(temp_dir, file))
        os.rmdir(temp_dir)

        # Send the zip file
        return send_file(
            memory_file,
            mimetype='application/zip',
            as_attachment=True,
            download_name='organized_photo_album.zip'
        )
    except Exception as e:
        # Clean up temporary files in case of error
        for file in os.listdir(temp_dir):
            os.remove(os.path.join(temp_dir, file))
        os.rmdir(temp_dir)
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
