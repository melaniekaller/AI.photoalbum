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

  // // Modified to handle multiple selections
  // const handleBestPhotoChange = (index, alternative, isAiSelected) => {
  //   const updatedAlbum = album.map((photo, i) => {
  //     if (i === index) {
  //       // Create or update the best_photos array
  //       const currentBestPhotos = photo.best_photos || [];
  //       const updatedBestPhotos = currentBestPhotos.includes(alternative)
  //         ? currentBestPhotos.filter(photo => photo !== alternative)
  //         : [...currentBestPhotos, alternative];

  //         console.log('Updated Best Photos:', updatedBestPhotos);
        
  //       return {
  //         ...photo,
  //         best_photos: updatedBestPhotos,
  //         // Keep best_photo for backwards compatibility
  //         best_photo: updatedBestPhotos[0] || alternative,
  //         is_ai_selected: isAiSelected
  //       };
  //     }
  //     return photo;
  //   });

  //   setAlbum(updatedAlbum);
  //   // Log the data being sent to the backend for verification
  //   // console.log('Sending updatedAlbum to backend:', updatedAlbum);
  //   // onBestPhotoChange(updatedAlbum);
  //   // Updated to handle JSON submission to the backend
  //   const handleSubmit = async () => {
  //     try {
  //       const response = await fetch('http://localhost:8000/api/update-best-photo', {
  //         method: 'POST',
  //         headers: {
  //           'Content-Type': 'application/json',
  //         },
  //         body: JSON.stringify({
  //           updatedPhotos: updatedAlbum,
  //           tempDir, // Ensure this variable is available in scope
  //         }),
  //       });

  //       if (!response.ok) {
  //         throw new Error(`Failed to update best photo: ${response.statusText}`);
  //       }

  //       const result = await response.json();
  //       console.log('Update successful:', result);
  //     } catch (error) {
  //       console.error('Error submitting best photo update:', error);
  //     }
  //   };

  //   handleSubmit();
  // };
  // };

  const handleBestPhotoChange = (index, alternative, isAiSelected) => {
    const updatedAlbum = album.map((photo, i) => {
      if (i === index) {
        const currentBestPhotos = photo.best_photos || [];
        const updatedBestPhotos = currentBestPhotos.includes(alternative)
          ? currentBestPhotos.filter(photo => photo !== alternative)
          : [...currentBestPhotos, alternative];
  
        console.log('Updated Best Photos:', updatedBestPhotos);
  
        return {
          ...photo,
          best_photos: updatedBestPhotos,
          best_photo: updatedBestPhotos[0] || alternative,
          is_ai_selected: isAiSelected,
        };
      }
      return photo;
    });
  
    setAlbum(updatedAlbum);
  
    const handleSubmit = async () => {
      try {
        const formData = new FormData();
        formData.append('tempDir', tempDir);
        formData.append('updatedPhotos', JSON.stringify(updatedAlbum));
  
        const response = await fetch('http://localhost:8000/api/update-best-photo', {
          method: 'POST',
          body: formData,
        });
  
        if (!response.ok) {
          throw new Error(`Failed to update best photo: ${response.statusText}`);
        }
  
        const result = await response.json();
        console.log('Update successful:', result);
      } catch (error) {
        console.error('Error submitting best photo update:', error);
      }
    };
  
    handleSubmit();
  
    // Inform the parent about the change
    if (onBestPhotoChange) {
      onBestPhotoChange(updatedAlbum);
    }
  };  

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {album.map((photo, index) => (
        <div key={index} className="border rounded-lg p-4">
          <h3 className="text-xl font-semibold mb-2">{photo.date || 'No Date'}</h3>
          
          {/* Main best photo display - show first selected best photo */}
          <div className="relative">
            <img
              src={getImageUrl(photo.best_photos?.[0] || photo.best_photo)}
              alt="Best photo"
              className={`w-full h-64 object-cover rounded-lg mb-4 ${photo.is_ai_selected ? 'border-4 border-green-500' : ''}`}
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
          <div className="flex overflow-x-auto gap-2">
            {photo.alternatives.map((alt, i) => (
              <img
                key={i}
                src={getImageUrl(alt)}
                alt={`Alternative ${i + 1}`}
                className={`w-14 h-14 object-cover rounded-lg cursor-pointer 
                  ${(photo.best_photos || []).includes(alt) 
                    ? 'border-4 border-blue-500' 
                    : 'border border-gray-300'}`}
                onClick={() => handleBestPhotoChange(index, alt, false)}
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
