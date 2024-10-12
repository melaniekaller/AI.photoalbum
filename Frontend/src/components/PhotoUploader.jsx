import React, { useState } from 'react';

function PhotoUploader({ children }) {
  const [images, setImages] = useState([]);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleFiles = (uploadedFiles) => {
    const newImages = uploadedFiles.map((file) => {
      return {
        src: URL.createObjectURL(file),
        name: file.name,
        file: file, // Store the actual file object
      };
    });
    setImages([...images, ...newImages]);
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      // First, upload the images if they haven't been uploaded yet
      const formData = new FormData();
      images.forEach((image, index) => {
        formData.append(`image${index}`, image.file, image.name);
      });

      // Upload images and get organized album
      const uploadResponse = await fetch('http://127.0.0.1:5000/api/upload-and-organize', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload and organize images');
      }

      // Get the download URL from the response
      const { downloadUrl } = await uploadResponse.json();

      // Trigger the download
      const downloadResponse = await fetch(downloadUrl);
      const blob = await downloadResponse.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'organized_photo_album.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading album:', error);
      alert('Failed to download the album. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return children({ images, handleFiles, handleDownload, isDownloading });
}

export default PhotoUploader;
