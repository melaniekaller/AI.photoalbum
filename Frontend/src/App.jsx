import React, { useState } from 'react';
import UploadZone from './components/UploadZone';
import PreviewGallery from './components/PreviewGallery';

function App() {
  const [images, setImages] = useState([]);

  // Funktion för att hantera uppladdade bilder
  const handleFiles = (uploadedFiles) => {
    const newImages = uploadedFiles.map((file) => {
      return {
        src: URL.createObjectURL(file),
        name: file.name,
      };
    });
    setImages([...images, ...newImages]);
  };

  const handleDownload = () => {
    // Funktion för att hantera nedladdning av sammanslagen mapp
    alert("Här kan du implementera nedladdningslogiken!");
  };

  return (
    <div className="h-screen bg-gray-100 p-5">
      <div className="max-w-4xl mx-auto">
        <p className="text-3xl font-bold text-center text-gray-800 mb-6">
          Dra och släpp dina mappar
        </p>
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
      </div>
    </div>
  );
}

export default App;
