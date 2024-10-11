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
from sklearn.metrics.pairwise import cosine_similarity

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
        
        # Combine features with dates and file paths
        data = list(zip(features_list, dates, file_paths))
        
        # Custom metric for DBSCAN
        def custom_metric(a, b):
            feature_similarity = cosine_similarity([a[0]], [b[0]])[0][0]
            date_diff = abs((a[1] - b[1]).days) if a[1] and b[1] else float('inf')
            return 1 - feature_similarity if date_diff <= 7 else np.inf  # 7-day threshold

        clustering = DBSCAN(eps=0.2, min_samples=2, metric=custom_metric)
        clusters = clustering.fit_predict(data)
        return clusters
    except Exception as e:
        logger.error(f"Error clustering images: {str(e)}")
        return None

def select_best_photo(cluster):
    try:
        if len(cluster) == 1:
            return cluster[0], []

        features = [process_image(photo) for photo in cluster]
        similarity_matrix = cosine_similarity(features)
        
        # Find groups of very similar photos
        similar_groups = []
        processed = set()
        for i in range(len(cluster)):
            if i not in processed:
                group = [i]
                for j in range(i+1, len(cluster)):
                    if similarity_matrix[i][j] > 0.95:  # Threshold for considering photos as very similar
                        group.append(j)
                similar_groups.append(group)
                processed.update(group)

        # Select the best photo from each group
        best_photos = []
        for group in similar_groups:
            # Here you can implement more sophisticated selection criteria
            # For now, we'll just choose the first photo in each group
            best_photo = cluster[group[0]]
            alternatives = [cluster[i] for i in group[1:]]
            best_photos.append((best_photo, alternatives))

        return best_photos
    except Exception as e:
        logger.error(f"Error selecting best photo: {str(e)}")
        return None

def organize_photos(file_paths, clusters):
    try:
        organized_photos = []
        for cluster in set(clusters):
            if cluster == -1:  # DBSCAN labels noise points as -1
                # Add individual photos that weren't clustered
                organized_photos.extend([(get_photo_date(file_paths[j]), file_paths[j], [], True) 
                                         for j in range(len(file_paths)) if clusters[j] == -1])
            else:
                cluster_files = [file_paths[j] for j in range(len(file_paths)) if clusters[j] == cluster]
                if cluster_files:
                    best_photos = select_best_photo(cluster_files)
                    for best_photo, alternatives in best_photos:
                        date = get_photo_date(best_photo)
                        organized_photos.append((date, best_photo, alternatives, True))
        
        # Sort photos by date
        organized_photos.sort(key=lambda x: x[0] if x[0] is not None else datetime.min)
        
        return organized_photos
    except Exception as e:
        logger.error(f"Error organizing photos: {str(e)}")
        return []

# Usage example (you can remove this from the actual utils.py file)
if __name__ == "__main__":
    image_path = "path/to/your/image.jpg"
    metadata = extract_metadata(image_path)
    if metadata:
        for tag, value in metadata.items():
            print(f"{tag}: {value}")
    else:
        print("No EXIF metadata found.")