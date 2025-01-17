# app/celery_app.py
from celery import Celery
from flask import Flask
from flask_cors import CORS

def make_celery(app):
    celery = Celery(
        app.import_name,
        backend=app.config['result_backend'],
        broker=app.config['broker_url']
    )
    celery.conf.update(app.config)
    return celery

# Flask app setup
app = Flask(__name__)
CORS(app, 
     resources={
         r"/*": {
             "origins": ["http://localhost:5175", "http://127.0.0.1:5175"],
            #  "origins": ["http://localhost:8000", "http://127.0.0.1:8000"],
             "methods": ["GET", "POST", "OPTIONS"],
             "allow_headers": ["Content-Type", "Authorization"],
             "expose_headers": ["Content-Range", "X-Content-Range"],
             "supports_credentials": True,
             "max_age": 120
         }
     }, 
     supports_credentials=True)

# Celery configuration
app.config.update(
    broker_url='redis://localhost:6379/0',
    result_backend='redis://localhost:6379/0'
)

celery = make_celery(app)
