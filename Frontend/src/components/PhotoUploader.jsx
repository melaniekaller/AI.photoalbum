import React, { useState } from 'react';

function PhotoUploader({ children }) {
  const [images, setImages] = useState([]);

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

  return children({ images, handleFiles, handleDownload });
}

export default PhotoUploader;