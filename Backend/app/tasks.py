from app.celery_app import celery  # Import celery from celery_app.py
from app.utils import process_single_image

@celery.task
def process_image_task(image_path):
    return process_single_image(image_path)
