import React, { useState, useEffect } from 'react';
import UploadZone from './components/UploadZone';  // Handles file uploading and creation of album
import PhotoAlbum from './components/PhotoAlbum';  // Handles showing the organized photos
import AlbumDownloader from './components/AlbumDownloader';  // Handles downloading the organized photos

function App() {
  const [organizedPhotos, setOrganizedPhotos] = useState([]);  // Stores organized photos
  const [tempDir, setTempDir] = useState(null);  // Temporary directory for downloading
  const [isAlbumCreated, setIsAlbumCreated] = useState(false);  // Tracks if the album is created
 

  // Handles when album is created and ready for preview and download
  const onAlbumCreated = (organizedPhotos, tempDir) => {
    setOrganizedPhotos(organizedPhotos);  // Set organized photos for preview
    setTempDir(tempDir);  // Save temp directory for download
    setIsAlbumCreated(true);  // Mark the album as created
  };

  // Define the handleFilesSelected function to handle the selected files
  const handleFilesSelected = (selectedFiles) => {
    console.log('Selected files:', selectedFiles);  // You can implement any file handling logic here
  };

  // This function will handle when the user selects a new best photo in PhotoAlbum
  const handleBestPhotoChange = async (updatedPhotos) => {
    setOrganizedPhotos(updatedPhotos);  // Update the state with new best photo selections
    
    // Send the updated best photo selection using FormData
    const formData = new FormData();
    formData.append('tempDir', tempDir);  // Add the temp directory to the form
    formData.append('updatedPhotos', JSON.stringify(updatedPhotos));  // Add updated photos as a JSON string

    // Send the updated best photo selection to the backend
    try {
      const response = await fetch('http://127.0.0.1:8000/api/update-best-photo', {
        method: 'POST',
        body: formData,  // Send FormData instead of JSON
      });

      if (!response.ok) {
        throw new Error('Failed to update best photo');
      }
    } catch (error) {
      console.error('Error updating best photo:', error);
    }
  };

  useEffect(() => {
    if (organizedPhotos.length > 0) {
      // Verify that images are accessible
      organizedPhotos.forEach(photo => {
        const img = new Image();
        img.onerror = () => console.error(`Failed to load image: ${photo.best_photo}`);
        img.src = `http://localhost:8000/uploads/${tempDir}/${photo.best_photo}`;
      });
    }
  }, [organizedPhotos, tempDir]);

  return (
    <div className=" font-playfair bg-blue-50 h-screen">
      <h1 className="text-5xl flex justify-center font-semibold py-10">Photo Album Creator</h1>
        <div className='flex justify-center mb-20'>
          <UploadZone onAlbumCreated={onAlbumCreated} />
        </div>

      {isAlbumCreated && (
        <div className='mx-14'>
          <h2 className="text-4xl flex justify-center font-semibold mb-8">Preview Your Organized Album</h2>

          <PhotoAlbum organizedPhotos={organizedPhotos} tempDir={tempDir} onBestPhotoChange={handleBestPhotoChange} />

          <div className='relative pb-16 pt-10'>
            <AlbumDownloader tempDir={tempDir}/>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
