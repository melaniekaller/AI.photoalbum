import React from 'react';
import PhotoUploader from './components/PhotoUploader';
import UploadZone from './components/UploadZone';
import PreviewGallery from './components/PreviewGallery';

function App() {
  return (
    <div className="h-screen bg-gray-100">
      <div className="w-2/3 mx-auto">
        <p className="text-3xl font-bold py-10 text-center text-gray-800">
          Make your photo album
        </p>
        <PhotoUploader>
          {({ images, handleFiles, handleDownload }) => (
            <>
              <UploadZone onFilesSelected={handleFiles} />
              {images.length > 0 && (
                <>
                  <PreviewGallery images={images} />
                  <div className="text-center mt-6">
                  <button onClick={handleDownload} disabled={isDownloading}>
                      {isDownloading ? 'Downloading...' : 'Download Album'}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </PhotoUploader>
      </div>
    </div>
  );
}

export default App;