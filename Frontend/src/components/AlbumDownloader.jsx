import React, { useState } from 'react';

const AlbumDownloader = ({ tempDir }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState(null);

  // const handleDownload = async () => {
  //   setIsDownloading(true);
  //   setError(null);
    
  //   try {
  //     const response = await fetch('http://localhost:8000/api/download-album?tempDir=${tempDir}', {
  //       method: 'GET',
  //       // headers: {
  //       //   'Content-Type': 'application/json',
  //       // },
  //       // body: JSON.stringify({ temp_dir: tempDir })
  //     });

  //     if (!response.ok) {
  //       throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  //     }

  //     // Get the blob from the response
  //     const blob = await response.blob();
      
  //     // Create a URL for the blob
  //     const url = window.URL.createObjectURL(blob);
      
  //     // Create a temporary link element
  //     const a = document.createElement('a');
  //     a.style.display = 'none';
  //     a.href = url;
  //     a.download = `photo_album_${tempDir}.zip`;
      
  //     // Add to document, click it, and remove it
  //     document.body.appendChild(a);
  //     a.click();
      
  //     // Clean up
  //     a.remove();
  //     window.URL.revokeObjectURL(url);
  //     // document.body.removeChild(a);
      
  //   } catch (error) {
  //     console.error('Download error:', error);
  //     setError(error.message);
  //   } finally {
  //     setIsDownloading(false);
  //   }
  // };
  const handleDownload = async () => {
    setIsDownloading(true);
    setError(null);
  
    try {
      const response = await fetch(`http://localhost:8000/api/download-album?tempDir=${tempDir}`, {
        method: 'GET',
      });
  
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorMessage = `Download failed: ${response.status} ${response.statusText}`;
        
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage += ` - ${errorData.error}`;
        } else {
          const errorText = await response.text();
          errorMessage += ` - ${errorText}`;
        }
        
        throw new Error(errorMessage);
      }
  
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `photo_album_${tempDir}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      setError(error.message);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="text-center mt-6">
      <button
        onClick={handleDownload}
        disabled={isDownloading}
        className={`bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded
          ${isDownloading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {isDownloading ? 'Creating Download...' : 'Download Album'}
      </button>
      
      {error && (
        <div className="text-red-500 mt-2">
          Error: {error}
        </div>
      )}
    </div>
  );
};

export default AlbumDownloader;
