import React, { useState, useEffect } from 'react';

const PhotoAlbum = ({ organizedPhotos, tempDir, onBestPhotoChange }) => {
  const [album, setAlbum] = useState(organizedPhotos);

  // Helper function to construct image URL
  const getImageUrl = (filename) => {
    if (!filename || !tempDir) return '';
    const cleanFilename = filename.split('/').pop();
    const cleanTempDir = tempDir.replace(/^\/+/, '').replace(/\/+$/, '');
    const url = `http://localhost:8000/uploads/${cleanTempDir}/${cleanFilename}`;
    console.log('Constructed URL:', url);
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

  // Modified to handle multiple selections
  const handleBestPhotoChange = (index, alternative) => {
    const updatedAlbum = album.map((photo, i) => {
      if (i === index) {
        // Create or update the best_photos array
        const currentBestPhotos = photo.best_photos || [];
        const updatedBestPhotos = currentBestPhotos.includes(alternative)
          ? currentBestPhotos.filter(photo => photo !== alternative)
          : [...currentBestPhotos, alternative];
        
        return {
          ...photo,
          best_photos: updatedBestPhotos,
          // Keep best_photo for backwards compatibility
          best_photo: updatedBestPhotos[0] || alternative
        };
      }
      return photo;
    });

    setAlbum(updatedAlbum);
    onBestPhotoChange(updatedAlbum);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
      {album.map((photo, index) => (
        <div key={index} className="border rounded-lg p-4">
          <h3 className="text-xl font-semibold mb-2">{photo.date || 'No Date'}</h3>
          
          {/* Main best photo display - show first selected best photo */}
          <div className="relative">
            <img
              src={getImageUrl(photo.best_photos?.[0] || photo.best_photo)}
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

          {/* Alternatives thumbnails with multiple selection */}
          <div className="flex flex-wrap gap-2">
            {photo.alternatives.map((alt, i) => (
              <img
                key={i}
                src={getImageUrl(alt)}
                alt={`Alternative ${i + 1}`}
                className={`w-16 h-16 object-cover rounded-lg cursor-pointer 
                  ${(photo.best_photos || []).includes(alt) 
                    ? 'border-4 border-blue-500' 
                    : 'border border-gray-300'}`}
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

          {/* Show count of selected best photos */}
          {photo.best_photos && photo.best_photos.length > 0 && (
            <div className="mt-2 text-sm text-gray-600">
              Selected as best: {photo.best_photos.length} photo(s)
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default PhotoAlbum;

