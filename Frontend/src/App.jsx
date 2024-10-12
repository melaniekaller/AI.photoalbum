import React from 'react';
import AlbumDownloader from './components/AlbumDownloader';
import UploadZone from './components/UploadZone';
import PreviewGallery from './components/PreviewGallery';
import PhotoAlbum from './components/Photoalbum';


function App() {
  return (
    <div className="h-screen bg-gray-100">
      <div className="w-1/3 mx-auto">
        <p className="text-3xl font-bold py-10 text-center text-gray-800">
          Make your photo album
        </p>
        <AlbumDownloader>
          {({ images, handleFiles, handleDownload }) => (
            <>
              <UploadZone onFilesSelected={handleFiles} />
              <PhotoAlbum/>
              {images.length > 0 && (
                <>
                  <PreviewGallery images={images} handleDownload={handleDownload} />
                </>
              )}
            </>
          )}
        </AlbumDownloader>
      </div>
    </div>
  );
}

export default App;