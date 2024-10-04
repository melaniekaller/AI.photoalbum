# backend/app/utils.py
from PIL import Image
import numpy as np
from tensorflow.keras.applications import ResNet50
from tensorflow.keras.applications.resnet50 import preprocess_input
from sklearn.cluster import DBSCAN

model = ResNet50(weights='imagenet', include_top=False)

def process_image(image_path):
    img = Image.open(image_path)
    img_array = np.array(img.resize((224, 224)))
    img_array = np.expand_dims(img_array, axis=0)
    img_array = preprocess_input(img_array)
    features = model.predict(img_array)
    return features.flatten()


def cluster_images(features_list):
    clustering = DBSCAN(eps=0.5, min_samples=2)
    clusters = clustering.fit_predict(features_list)
    return clusters