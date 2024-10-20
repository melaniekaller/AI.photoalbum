import React, { useState } from 'react';

const AlbumDownloader = ({ tempDir }) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/download-album', {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: JSON.stringify({ temp_dir: tempDir }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'organized_photo_album.zip';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('Failed to download album.');
      }
    } catch (error) {
      console.error('Error downloading album:', error);
    } finally {
      setIsDownloading(false);
    }
    };
  
    return (
      <div className="text-center mt-6">
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          {isDownloading ? 'Downloading Album...' : 'Download Album'}
        </button>
      </div>
    );
  };
  
  export default AlbumDownloader;
