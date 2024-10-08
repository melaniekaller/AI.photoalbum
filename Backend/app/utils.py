# backend/app/utils.py
import os
from PIL import Image
from PIL.ExifTags import TAGS
import numpy as np
from keras.applications import ResNet50
from keras.applications.resnet50 import preprocess_input
from sklearn.cluster import DBSCAN
from datetime import datetime, timedelta
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

model = ResNet50(weights='imagenet', include_top=False)

def get_photo_date(file_path):
    try:
        metadata = extract_metadata(file_path)
        date_taken = metadata.get('DateTimeOriginal')
        if date_taken:
            return datetime.strptime(date_taken, "%Y:%m:%d %H:%M:%S")
        else:
            # If DateTimeOriginal is not available, use file modification time
            return datetime.fromtimestamp(os.path.getmtime(file_path))
    except Exception as e:
        logger.error(f"Error getting photo date for {file_path}: {str(e)}")
        return None

def process_image(file_path):
    try:
        img = Image.open(file_path)
        img_array = np.array(img.resize((224, 224)))
        img_array = np.expand_dims(img_array, axis=0)
        img_array = preprocess_input(img_array)
        features = model.predict(img_array)
        return features.flatten()
    except Exception as e:
        logger.error(f"Error processing image {file_path}: {str(e)}")
        return None

def extract_metadata(file_path):
    try:
        with Image.open(file_path) as img:
            exif_data = img._getexif()
            metadata = {}
            if exif_data:
                for tag_id, value in exif_data.items():
                    tag = TAGS.get(tag_id, tag_id)
                    metadata[tag] = value
            return metadata
    except Exception as e:
        logger.error(f"Error extracting metadata from {file_path}: {str(e)}")
        return {}

def cluster_images(file_paths, features_list):
    try:
        dates = [get_photo_date(file_path) for file_path in file_paths]
        
        # Combine features with dates
        data = list(zip(features_list, dates))
        
        # Custom metric for DBSCAN
        def custom_metric(a, b):
            feature_dist = np.linalg.norm(a[0] - b[0])
            date_diff = abs((a[1] - b[1]).days)
            return feature_dist if date_diff <= 7 else np.inf

        clustering = DBSCAN(eps=0.5, min_samples=2, metric=custom_metric)
        clusters = clustering.fit_predict(data)
        return clusters
    except Exception as e:
        logger.error(f"Error clustering images: {str(e)}")
        return None

def select_best_photo(cluster):
    # This is a simple implementation. You might want to enhance this based on your specific criteria.
    try:
        # For now, just return the first photo in the cluster
        return cluster[0] if cluster else None
    except Exception as e:
        logger.error(f"Error selecting best photo: {str(e)}")
        return None

def organize_photos(file_paths, clusters):
    try:
        organized_photos = []
        for i, cluster in enumerate(set(clusters)):
            if cluster == -1:  # DBSCAN labels noise points as -1
                continue
            cluster_files = [file_paths[j] for j in range(len(file_paths)) if clusters[j] == cluster]
            if cluster_files:
                best_photo = select_best_photo(cluster_files)
                date = get_photo_date(best_photo)
                organized_photos.append((date, best_photo))
                # Add other photos from the cluster
                for photo in cluster_files:
                    if photo != best_photo:
                        organized_photos.append((date, photo))
        
        # Sort photos by date
        organized_photos.sort(key=lambda x: x[0] if x[0] is not None else datetime.min)
        
        return [photo for _, photo in organized_photos]
    except Exception as e:
        logger.error(f"Error organizing photos: {str(e)}")
        return []

def generate_album(organized_photos):
    # In this case, generate_album doesn't need to do anything extra
    # as organize_photos already returns a single list of organized photos
    return organized_photos

# Usage example (you can remove this from the actual utils.py file)
if __name__ == "__main__":
    image_path = "path/to/your/image.jpg"
    metadata = extract_metadata(image_path)
    if metadata:
        for tag, value in metadata.items():
            print(f"{tag}: {value}")
    else:
        print("No EXIF metadata found.")