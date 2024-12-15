import React, { useState, useEffect } from 'react';

const PhotoAlbum = ({ organizedPhotos, tempDir, onBestPhotoChange }) => {
  const [album, setAlbum] = useState(organizedPhotos);

  // Helper function to construct image URL
  const getImageUrl = (filename) => {
    if (!filename || !tempDir) return '';
    // Clean up the filename and tempDir
    const cleanFilename = filename.split('/').pop();
    const cleanTempDir = tempDir.replace(/^\/+/, '').replace(/\/+$/, '');
    const url = `http://localhost:8000/uploads/${cleanTempDir}/${cleanFilename}`;
    console.log('Constructed URL:', url); // Debug log
    return url;
  };

  useEffect(() => {
    // Log the image paths to debug
    console.log('Album data:', album);
    console.log('Temp directory:', tempDir);
    
    // Verify all image paths
    album.forEach(photo => {
      console.log('Best photo URL:', getImageUrl(photo.best_photo));
      photo.alternatives.forEach(alt => {
        console.log('Alternative URL:', getImageUrl(alt));
      });
    });
  }, [album, tempDir]);

  const handleBestPhotoChange = (index, alternative) => {
    const updatedAlbum = album.map((photo, i) => {
      if (i === index) {
        return { ...photo, best_photo: alternative, is_best: true };
      }
      return { ...photo, is_best: false };
    });

    setAlbum(updatedAlbum);
    onBestPhotoChange(updatedAlbum);
  };

  // Constants for placeholder images
  const PLACEHOLDER_URL = 'http://localhost:8000/static/images/placeholder.jpg';
  const PLACEHOLDER_THUMB_URL = 'http://localhost:8000/static/images/placeholder-thumb.jpg';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {album.map((photo, index) => (
        <div key={index} className="border rounded-lg p-4">
          <h3 className="text-xl font-semibold mb-2">{photo.date || 'No Date'}</h3>
          
          {/* Main best photo display */}
          <div className="relative">
            <img
              src={getImageUrl(photo.best_photo)}
              alt="Best photo"
              className="w-full h-64 object-cover rounded-lg mb-4"
              onError={(e) => {
                console.error(`Error loading image:`, {
                  src: e.target.src,
                  photo: photo.best_photo,
                  tempDir
                });
              }}
            />
          </div>

          {/* Alternatives thumbnails */}
          <div className="flex flex-wrap gap-2">
            {photo.alternatives.map((alt, i) => (
              <img
                key={i}
                src={getImageUrl(alt)}
                alt={`Alternative ${i + 1}`}
                className={`w-16 h-16 object-cover rounded-lg cursor-pointer 
                  ${photo.best_photo === alt ? 'border-4 border-blue-500' : 'border border-gray-300'}`}
                onClick={() => handleBestPhotoChange(index, alt)}
                onError={(e) => {
                  console.error(`Error loading thumbnail:`, {
                    src: e.target.src,
                    photo: alt,
                    tempDir
                  });
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PhotoAlbum;

