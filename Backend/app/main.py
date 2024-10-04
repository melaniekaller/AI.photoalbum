# backend/app/main.py
from fastapi import FastAPI
from .models import Photo
from .utils import process_image, cluster_images

app = FastAPI()

@app.post("/upload")
async def upload_photo(photo: Photo):
    # Process and store photo
    pass

@app.get("/organize")
async def organize_photos():
    # Cluster and organize photos
    pass