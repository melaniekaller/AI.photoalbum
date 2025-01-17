import os
import tensorflow as tf
from PIL import Image
from PIL.ExifTags import TAGS
# import tensorflow as tf
from tensorflow import keras
from tensorflow.keras.applications.resnet50 import ResNet50, preprocess_input
import numpy as np
from sklearn.cluster import DBSCAN
from datetime import datetime, timedelta
import logging
from sklearn.metrics.pairwise import cosine_similarity
import concurrent.futures
import cv2
from skimage import exposure
from PIL import Image, ImageDraw, ImageFont

# Set up logging
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # Suppress TensorFlow warnings
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load the ResNet50 model once globally
model = ResNet50(weights='imagenet', include_top=False)

def extract_metadata(file_path):
    """Extract EXIF metadata from an image file."""
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
    """Get the date from EXIF metadata or file's modification time."""
    try:
        metadata = extract_metadata(file_path)
        date_taken = metadata.get('DateTimeOriginal')
        if date_taken:
            logger.info(f"Date extracted for {file_path}: {date_taken}")
            return datetime.strptime(date_taken, "%Y:%m:%d %H:%M:%S")
        else:
            logger.warning(f"No EXIF date found for {file_path}. Using file modification time.")
            logger.info(f"Modification date for {file_path}: {os.path.getmtime(file_path)}")
            return datetime.fromtimestamp(os.path.getmtime(file_path))
    except Exception as e:
        logger.error(f"Error getting photo date for {file_path}: {str(e)}")
        return None
    
def extract_frames_from_video(video_path, frame_rate=1):
    """Extract frames from a video file at a specified frame rate."""
    try:
        video_capture = cv2.VideoCapture(video_path)
        frames = []
        count = 0
        success, image = video_capture.read()
        while success:
            if count % frame_rate == 0:
                frames.append(image)
            success, image = video_capture.read()
            count += 1
        video_capture.release()
        return frames
    except Exception as e:
        logger.error(f"Error extracting frames from video {video_path}: {str(e)}")
        return []

def process_images(file_or_folder_path):
    features_list = []
    image_paths = []

    valid_image_extensions = ['.jpg', '.jpeg', '.png']
    valid_video_extensions = ['.mp4', '.avi']

    if os.path.isdir(file_or_folder_path):
        files = [os.path.join(file_or_folder_path, f) for f in os.listdir(file_or_folder_path)]
    else:
        files = [file_or_folder_path]

    for file_path in files:
        ext = os.path.splitext(file_path)[1].lower()
        if ext in valid_image_extensions:
            features = process_single_image(file_path)
            if features is not None:
                features_list.append(features)
                image_paths.append(file_path)
        elif ext in valid_video_extensions:
            frames = extract_frames_from_video(file_path)
            for frame in frames:
                features = process_single_image(frame)
                if features is not None:
                    features_list.append(features)
                    image_paths.append(file_path)

    logger.info(f"Processed {len(image_paths)} files.")
    return features_list, image_paths


def process_single_image(file_path):
    """Process a single image and return its feature vector."""
    try:
        with Image.open(file_path) as img:
            img.verify()  # Check file integrity
            img = Image.open(file_path)  # Reopen for actual processing
            img_array = np.array(img.resize((224, 224)))
            img_array = np.expand_dims(img_array, axis=0)
            img_array = preprocess_input(img_array)
            logger.info(f"Processing image: {file_path}")
            features = model.predict(img_array)
            logger.info(f"Image processed successfully: {file_path}")
            return features.flatten()
    except (IOError, SyntaxError, ValueError) as e:
        logger.error(f"Error processing image {file_path}: {e}")
        return None

def cluster_images(file_paths, features_list):
    """Cluster images using DBSCAN and a custom metric based on visual similarity."""
    try:
        if not features_list:
            # If no features are provided, skip clustering and return no clusters
            logger.warning("No valid features to cluster. Proceeding without clustering.")
            return [-1] * len(file_paths)  # Treat all photos as unclustered (-1)

        valid_data = [(f, file) for f, file in zip(features_list, file_paths) if f is not None]
        if not valid_data:
            logger.warning("No valid features found for clustering. Proceeding without clustering.")
            return [-1] * len(file_paths)  # Treat all photos as unclustered (-1)

        features_list, file_paths = zip(*valid_data)

        logger.info(f"Running DBSCAN on {len(file_paths)} images.")
        clustering = DBSCAN(eps=0.6, min_samples=2, metric='cosine')
        initial_clusters = clustering.fit_predict(features_list)
        logger.info(f"Initial clustering found {len(set(initial_clusters)) - (1 if -1 in initial_clusters else 0)} clusters.")

        if len(set(initial_clusters)) == 1 and -1 in set(initial_clusters):
            logger.warning("No clusters found. Proceeding without clustering.")
            return [-1] * len(file_paths)  # Treat all photos as unclustered (-1)

        dates = [get_photo_date(file_path) for file_path in file_paths]
        final_clusters = []
        cluster_id = 0

        for cluster_label in set(initial_clusters):
            if cluster_label == -1:
                for idx, label in enumerate(initial_clusters):
                    if label == -1:
                        final_clusters.append((cluster_id, [idx]))
                        cluster_id += 1
            else:
                indices = [i for i, label in enumerate(initial_clusters) if label == cluster_label]
                sorted_indices = sorted(indices, key=lambda i: dates[i] if dates[i] else datetime.min)
                current_group = [sorted_indices[0]]
                for i in range(1, len(sorted_indices)):
                    idx_prev = sorted_indices[i - 1]
                    idx_curr = sorted_indices[i]
                    date_diff = abs((dates[idx_curr] - dates[idx_prev]).days) if dates[idx_curr] and dates[idx_prev] else float('inf')
                    if date_diff <= 7:
                        current_group.append(idx_curr)
                    else:
                        final_clusters.append((cluster_id, current_group))
                        cluster_id += 1
                        current_group = [idx_curr]

                if current_group:
                    final_clusters.append((cluster_id, current_group))
                    cluster_id += 1

        clusters = [-1] * len(file_paths)
        for cluster_label, indices in final_clusters:
            for idx in indices:
                clusters[idx] = cluster_label

        logger.info(f"Final clustering found {cluster_id} clusters.")
        return clusters
    except Exception as e:
        logger.error(f"Error clustering images: {str(e)}")
        return [-1] * len(file_paths)  # Treat all photos as unclustered (-1)

def calculate_sharpness(image_path):
    """Calculate image sharpness using the Laplacian method."""
    image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if image is None:
        return 0  # Return low sharpness if the image cannot be loaded
    laplacian = cv2.Laplacian(image, cv2.CV_64F)
    sharpness = laplacian.var()
    return sharpness

def calculate_exposure(image_path):
    """Evaluate exposure using histogram analysis."""
    image = cv2.imread(image_path)
    if image is None:
        return 0  # Return low score if the image cannot be loaded
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    brightness = hsv[..., 2].mean()  # Analyze the V channel in HSV space
    return brightness

def detect_faces(image_path):
    """Detect faces in the image using OpenCV's pre-trained model."""
    image = cv2.imread(image_path)
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)
    return len(faces)

def select_best_photo(image_paths):
    """Select the best photo based on sharpness, exposure, and face detection."""
    best_photos = []
    for photo_path in image_paths:
        sharpness = calculate_sharpness(photo_path)
        exposure_value = calculate_exposure(photo_path)
        faces = detect_faces(photo_path)
        
        # Combine criteria into a score (weights can be adjusted as needed)
        score = (sharpness * 0.5) + (exposure_value * 0.3) + (faces * 0.2)
        best_photos.append((photo_path, score))
    
    # Sort by score and select the best photo
    best_photos.sort(key=lambda x: x[1], reverse=True)
    
    # Choose the top photo, the rest can be alternatives
    best_photo = best_photos[0][0]
    alternatives = [photo[0] for photo in best_photos[1:]]
    
    return [(best_photo, alternatives, True)]

def organize_photos(file_paths, clusters):
    """Organize photos into clusters with date metadata."""
    try:
        organized_photos = []
        for cluster in set(clusters):
            if cluster == -1:
                organized_photos.extend([(get_photo_date(file_paths[j]), file_paths[j], [], True)
                                         for j in range(len(file_paths)) if clusters[j] == -1])
            else:
                cluster_files = [file_paths[j] for j in range(len(file_paths)) if clusters[j] == cluster]
                if cluster_files:
                    logger.info(f"Organizing {len(cluster_files)} photos for cluster {cluster}")
                    cluster_files.sort(key=lambda f: get_photo_date(f) or datetime.min)
                    split_clusters = []
                    current_cluster = [cluster_files[0]]
                    for i in range(1, len(cluster_files)):
                        date_prev = get_photo_date(cluster_files[i - 1])
                        date_curr = get_photo_date(cluster_files[i])
                        date_diff = abs((date_curr - date_prev).days) if date_curr and date_prev else float('inf')
                        if date_diff <= 7:
                            current_cluster.append(cluster_files[i])
                        else:
                            split_clusters.append(current_cluster)
                            current_cluster = [cluster_files[i]]
                    if current_cluster:
                        split_clusters.append(current_cluster)
                    for sub_cluster in split_clusters:
                        best_photos = select_best_photo(sub_cluster)
                        for best_photo, alternatives, is_best in best_photos:
                            date = get_photo_date(best_photo)
                            organized_photos.append((date, best_photo, alternatives, is_best))
        organized_photos.sort(key=lambda x: x[0] if x[0] is not None else datetime.min)
        return organized_photos

        if not organized_photos:
            logger.error("No valid photos organized. Returning empty album.")

    except Exception as e:
        logger.error(f"Error organizing photos: {str(e)}")
        return []