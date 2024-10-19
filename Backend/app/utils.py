# backend/app/utils.py
import os
from PIL import Image
from PIL.ExifTags import TAGS
import keras
from keras.applications.resnet50 import ResNet50
from keras.applications.resnet50 import preprocess_input, decode_predictions
import numpy as np
from sklearn.cluster import DBSCAN
from datetime import datetime, timedelta
import logging
from sklearn.metrics.pairwise import cosine_similarity

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

model = ResNet50(weights='imagenet', include_top=False)

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
    
def get_photo_date(file_path):
    try:
        metadata = extract_metadata(file_path)
        date_taken = metadata.get('DateTimeOriginal')
        if date_taken:
            logger.info(f"Date extracted for {file_path}: {date_taken}")
            return datetime.strptime(date_taken, "%Y:%m:%d %H:%M:%S")
        else:
            logger.warning(f"No EXIF date found for {file_path}. Using file modification time.")
            return datetime.fromtimestamp(os.path.getmtime(file_path))
    except Exception as e:
        logger.error(f"Error getting photo date for {file_path}: {str(e)}")
        return None


# process_images hanterar både enstaka bilder och mappar
def process_images(file_or_folder_path):
    features_list = []
    image_paths = []

    # Kontrollera om det är en fil eller en mapp
    if os.path.isfile(file_or_folder_path):
        # Om det är en fil, behandla den enskilda bilden
        features = process_single_image(file_or_folder_path)
        if features is not None:
            features_list.append(features)
            image_paths.append(file_or_folder_path)
    elif os.path.isdir(file_or_folder_path):
        # Om det är en mapp, behandla alla bilder i mappen
        valid_extensions = ['.jpg', '.jpeg', '.png']
        for file_name in os.listdir(file_or_folder_path):
            if os.path.splitext(file_name)[1].lower() in valid_extensions:
                image_path = os.path.join(file_or_folder_path, file_name)
                features = process_single_image(image_path)
                if features is not None:
                    features_list.append(features)
                    image_paths.append(image_path)
    else:
        logger.error(f"Path {file_or_folder_path} is neither a file nor a directory.")
        return None, None
    
    # Returnera listan med funktionsvektorer och bildvägar
    return features_list, image_paths

# process_single_image bearbetar en enda bild
def process_single_image(file_path):
    try:
        img = Image.open(file_path)
        img_array = np.array(img.resize((224, 224)))
        img_array = np.expand_dims(img_array, axis=0)
        img_array = preprocess_input(img_array)
        logger.info(f"Processing image: {file_path}")
        features = model.predict(img_array)
        logger.info(f"Image processed successfully: {file_path}")
        return features.flatten()
    except Exception as e:
        logger.error(f"Error processing image {file_path}: {str(e)}")
        return None

def cluster_images(file_paths, features_list):
    try:
        # Säkerställ att alla funktionsvektorer är giltiga
        valid_data = [(f, file) for f, file in zip(features_list, file_paths) if f is not None]
        if not valid_data:
            logger.error("No valid features found for clustering.")
            return None

        features_list, file_paths = zip(*valid_data)

        # Klustra bilder baserat på visuella likheter
        logger.info(f"Running DBSCAN on {len(file_paths)} images.")
        clustering = DBSCAN(eps=0.7, min_samples=2, metric='cosine')
        initial_clusters = clustering.fit_predict(features_list)
        logger.info(f"Initial clustering completed. Found {len(set(initial_clusters)) - (1 if -1 in initial_clusters else 0)} clusters.")

        # Efterklustring baserat på tid
        dates = [get_photo_date(file_path) for file_path in file_paths]
        final_clusters = []
        cluster_id = 0
        for cluster_label in set(initial_clusters):
            if cluster_label == -1:
                # Hantera brus (bilder som inte tillhör något kluster)
                for idx, label in enumerate(initial_clusters):
                    if label == -1:
                        final_clusters.append((cluster_id, [idx]))
                        cluster_id += 1
            else:
                # Hämta index för bilder i klustret
                indices = [i for i, label in enumerate(initial_clusters) if label == cluster_label]
                # Sortera bilderna i klustret efter datum
                sorted_indices = sorted(indices, key=lambda i: dates[i] if dates[i] else datetime.min)
                # Dela upp klustret baserat på tid
                current_group = [sorted_indices[0]]
                for i in range(1, len(sorted_indices)):
                    idx_prev = sorted_indices[i - 1]
                    idx_curr = sorted_indices[i]
                    date_diff = abs((dates[idx_curr] - dates[idx_prev]).days) if dates[idx_curr] and dates[idx_prev] else float('inf')
                    if date_diff <= 7:
                        current_group.append(idx_curr)
                    else:
                        # Spara nuvarande grupp och starta en ny
                        final_clusters.append((cluster_id, current_group))
                        cluster_id += 1
                        current_group = [idx_curr]
                # Lägg till den sista gruppen
                if current_group:
                    final_clusters.append((cluster_id, current_group))
                    cluster_id += 1

        # Skapa en lista med klusteretiketter för varje bild
        clusters = [-1] * len(file_paths)
        for cluster_label, indices in final_clusters:
            for idx in indices:
                clusters[idx] = cluster_label

        logger.info(f"Final clustering completed. Found {cluster_id} clusters.")
        return clusters
    except Exception as e:
        logger.error(f"Error clustering images: {str(e)}")
        return None

def select_best_photo(photo_group):
    try:
        if len(photo_group) == 1:
            return [(photo_group[0], [])]  # Only one photo, no alternatives

        # Extract features and dates for all photos
        features = [process_single_image(photo) for photo in photo_group]
        dates = [get_photo_date(photo) for photo in photo_group]

        similar_groups = []
        processed = set()

        # Group photos based on time (within 30 minutes) and visual similarity (> 0.95)
        for i in range(len(photo_group)):
            if i not in processed:
                group = [i]
                for j in range(i + 1, len(photo_group)):
                    time_diff = abs((dates[j] - dates[i]).total_seconds()) if dates[i] and dates[j] else float('inf')
                    visual_similarity = cosine_similarity([features[i]], [features[j]])[0][0]
                    
                    if time_diff <= 1800 and visual_similarity > 0.9:
                        group.append(j)
                if len(group) > 1:
                    similar_groups.append(group)
                processed.update(group)

        # If no similar groups were found, return all photos as they are
        if not similar_groups:
            return [(photo, []) for photo in photo_group]

        # Select the best photo in each group
        best_photos = []
        for group in similar_groups:
            best_photo_idx = None
            best_photo_score = -float('inf')

            for idx in group:
                score = np.linalg.norm(features[idx])  # Use the norm of the feature vector as the score
                if score > best_photo_score:
                    best_photo_score = score
                    best_photo_idx = idx

            best_photo = photo_group[best_photo_idx]
            alternatives = [photo_group[i] for i in group if i != best_photo_idx]
            best_photos.append((best_photo, alternatives))

        return best_photos
    except Exception as e:
        logger.error(f"Error selecting best photo: {str(e)}")
        return [(photo_group[0], [])]  # Return the first photo if an error occurs

def organize_photos(file_paths, clusters):
    try:
        organized_photos = []
        for cluster in set(clusters):
            if cluster == -1:
                # Handle unclustered (noise) photos
                organized_photos.extend([(get_photo_date(file_paths[j]), file_paths[j], [], True) 
                                         for j in range(len(file_paths)) if clusters[j] == -1])
            else:
                # Get all photos in this cluster
                cluster_files = [file_paths[j] for j in range(len(file_paths)) if clusters[j] == cluster]
                if cluster_files:
                    # Sort photos in the cluster by date
                    cluster_files.sort(key=lambda f: get_photo_date(f) or datetime.min)

                    # Split cluster based on a 7-day time difference
                    split_clusters = []
                    current_cluster = [cluster_files[0]]
                    for i in range(1, len(cluster_files)):
                        date_prev = get_photo_date(cluster_files[i - 1])
                        date_curr = get_photo_date(cluster_files[i])
                        date_diff = abs((date_curr - date_prev).days) if date_curr and date_prev else float('inf')

                        if date_diff <= 7:
                            current_cluster.append(cluster_files[i])
                        else:
                            # Finalize current group and start a new one
                            split_clusters.append(current_cluster)
                            current_cluster = [cluster_files[i]]

                    # Add the final group
                    if current_cluster:
                        split_clusters.append(current_cluster)

                    # Process each group to find the best photo, or leave them as they are
                    for sub_cluster in split_clusters:
                        best_photos = select_best_photo(sub_cluster)
                        for best_photo, alternatives in best_photos:
                            date = get_photo_date(best_photo)
                            organized_photos.append((date, best_photo, alternatives, True))

        # Sort all organized photos by date
        organized_photos.sort(key=lambda x: x[0] if x[0] is not None else datetime.min)

        return organized_photos
    except Exception as e:
        logger.error(f"Error organizing photos: {str(e)}")
        return []



# Usage example (you can remove this from the actual utils.py file)
# if __name__ == "__main__":
#     image_path = "path/to/your/image.jpg"
#     metadata = extract_metadata(image_path)
#     if metadata:
#         for tag, value in metadata.items():
#             print(f"{tag}: {value}")
#     else:
#         print("No EXIF metadata found.")

# if __name__ == "__main__":
#     path = "C:\\Users\\melan\\Pictures\\testbilder"
#     features, file_paths = process_images(path)
#     clusters = cluster_images(file_paths, features)
#     if clusters is not None:
#         organized_photos = organize_photos(file_paths, clusters)
#         for date, best_photo, alternatives, is_best in organized_photos:
#             print(f"Date: {date}, Best Photo: {best_photo}, Alternatives: {alternatives}")
#     else:
#         print("No clusters found.")

if __name__ == "__main__":
    path = "C:\\Users\\melan\\Pictures\\testbilder"
    
    # Step 1: Extract EXIF Metadata (Optional, but useful for metadata analysis)
    # Optionally uncomment this block to print metadata for individual files
    for image_file in os.listdir(path):
        if image_file.lower().endswith(('.jpg', '.jpeg', '.png')):
            image_path = os.path.join(path, image_file)
            metadata = extract_metadata(image_path)
            if metadata:
                print(f"Metadata for {image_file}:")
                for tag, value in metadata.items():
                    print(f"{tag}: {value}")
            else:
                print(f"No EXIF metadata found for {image_file}")
    
    # Step 2: Process images for clustering
    features, file_paths = process_images(path)
    clusters = cluster_images(file_paths, features)
    
    # Step 3: Organize and select best photos
    if clusters is not None:
        organized_photos = organize_photos(file_paths, clusters)
        for date, best_photo, alternatives, is_best in organized_photos:
            print(f"Date: {date}, Best Photo: {best_photo}, Alternatives: {alternatives}")
    else:
        print("No clusters found.")
