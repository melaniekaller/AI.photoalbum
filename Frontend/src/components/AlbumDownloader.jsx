// import React, { useState } from 'react';

// function AlbumDownloader({ children }) {
//   const [isDownloading, setIsDownloading] = useState(false);

//   const handleDownload = async (images) => {
//     setIsDownloading(true);
//     try {
//       // Prepare and upload images
//       const formData = new FormData();
//       images.forEach((image, index) => {
//         formData.append(`image${index}`, image.file, image.name);
//       });

//       // Upload images and get organized album
//       const uploadResponse = await fetch('http://127.0.0.1:5000/api/upload-and-organize', {
//         method: 'POST',
//         body: formData,
//       });

//       if (!uploadResponse.ok) {
//         throw new Error('Failed to upload and organize images');
//       }

//       // Get the download URL from the response
//       const { downloadUrl } = await uploadResponse.json();

//       // Trigger the download
//       const downloadResponse = await fetch(downloadUrl);
//       const blob = await downloadResponse.blob();
//       const url = window.URL.createObjectURL(blob);
//       const a = document.createElement('a');
//       a.style.display = 'none';
//       a.href = url;
//       a.download = 'organized_photo_album.zip';
//       document.body.appendChild(a);
//       a.click();
//       window.URL.revokeObjectURL(url);
//     } catch (error) {
//       console.error('Error downloading album:', error);
//       alert('Failed to download the album. Please try again.');
//     } finally {
//       setIsDownloading(false);
//     }
//   };

//   return children({ handleDownload, isDownloading });
// }

// export default AlbumDownloader;

















// latest version

// import React, { useState } from 'react';

// function AlbumDownloader({ children }) {
//   const [isDownloading, setIsDownloading] = useState(false);

//   const handleDownload = async (images = []) => {
//     if (images.length === 0) {
//       alert("No images available for download.");
//       setIsDownloading(false);
//       return;
//     }

//     setIsDownloading(true);
//     try {
//       // Prepare and upload images
//       const formData = new FormData();
//       images.forEach((image, index) => {
//         formData.append(`image${index}`, image.file, image.name);
//       });

//       // Upload images and get organized album
//       const uploadResponse = await fetch('http://127.0.0.1:5000/api/upload-and-organize', {
//         method: 'POST',
//         body: formData,
//       });

//       if (!uploadResponse.ok) {
//         throw new Error('Failed to upload and organize images');
//       }

//       // Get the download URL from the response
//       const { downloadUrl } = await uploadResponse.json();
//       if (!downloadUrl) {
//         throw new Error('No download URL received from server');
//       }

//       // Trigger the download
//       const downloadResponse = await fetch(downloadUrl);
//       const blob = await downloadResponse.blob();
//       const url = window.URL.createObjectURL(blob);
//       const a = document.createElement('a');
//       a.style.display = 'none';
//       a.href = url;
//       a.download = 'organized_photo_album.zip';
//       document.body.appendChild(a);
//       a.click();
//       window.URL.revokeObjectURL(url);
//       document.body.removeChild(a); // Clean up the DOM element
//     } catch (error) {
//       console.error('Error downloading album:', error);
//       if (error instanceof TypeError) {
//         alert('Network error. Please check your internet connection.');
//       } else {
//         alert(`Failed to download the album: ${error.message}`);
//       }
//     } finally {
//       setIsDownloading(false);
//     }
//   };

//   return children({ handleDownload, isDownloading });
// }

// export default AlbumDownloader;



import React, { useState } from 'react';

const AlbumDownloader = ({ tempDir }) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch('http://127.0.0.1:5000/api/download-album', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
