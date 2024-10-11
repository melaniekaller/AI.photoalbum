from flask import Flask, jsonify
from flask_cors import CORS
from utils import organize_photos, process_image, cluster_images
import os

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

if __name__ == '__main__':
    app.run(debug=True)