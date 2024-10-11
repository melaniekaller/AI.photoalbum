import React from 'react';
import PhotoUploader from './components/PhotoUploader';
import UploadZone from './components/UploadZone';
import PreviewGallery from './components/PreviewGallery';

function App() {
  return (
    <div className="h-screen bg-gray-100 p-5">
      <div className="max-w-4xl mx-auto">
        <p className="text-3xl font-bold text-center text-gray-800 mb-6">
          Dra och släpp dina mappar
        </p>
        <PhotoUploader>
          {({ images, handleFiles, handleDownload }) => (
            <>
              <UploadZone onFilesSelected={handleFiles} />
              {images.length > 0 && (
                <>
                  <PreviewGallery images={images} />
                  <div className="text-center mt-6">
                    <button
                      onClick={handleDownload}
                      className="bg-blue-500 text-white font-semibold py-2 px-6 rounded hover:bg-blue-600"
                    >
                      Ladda ner sammanslagen mapp
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