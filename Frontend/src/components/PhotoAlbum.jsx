import React, { useState } from 'react';

const PhotoAlbum = ({ organizedPhotos, onBestPhotoChange }) => {
  const [album, setAlbum] = useState(organizedPhotos);

  // This function will be called when the user selects a new best photo
  const handleBestPhotoChange = (index, alternative) => {
    // Update the best photo in the album
    const updatedAlbum = album.map((photo, i) => {
      if (i === index) {
        return { ...photo, best_photo: alternative, is_best: true };
      }
      return { ...photo, is_best: false };
    });

    setAlbum(updatedAlbum);
    onBestPhotoChange(updatedAlbum); // Pass the updated album back to parent component
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {album.map((photo, index) => (
        <div key={index} className="border rounded-lg p-4">
          <h3 className="text-xl font-semibold mb-2">{photo.date || 'No Date'}</h3>
          <img
            src={photo.best_photo}
            alt="Best photo"
            className="w-full h-64 object-cover rounded-lg mb-4"
          />
          <div className="flex space-x-2">
            {photo.alternatives.map((alt, i) => (
              <img
                key={i}
                src={alt}
                alt={`Alternative ${i + 1}`}
                className={`w-16 h-16 object-cover rounded-lg cursor-pointer ${photo.best_photo === alt ? 'border-4 border-green-500' : ''}`}
                onClick={() => handleBestPhotoChange(index, alt)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PhotoAlbum;

