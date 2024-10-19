// import React from 'react';
// import AlbumDownloader from './components/AlbumDownloader';
// import UploadZone from './components/UploadZone';
// import PreviewGallery from './components/PreviewGallery';
// import PhotoAlbum from './components/Photoalbum';
// import { useState } from 'react';

// function App() {
//   const [images, setImages] = useState([]); // Add state to store uploaded images

//   const handleFiles = (newImages) => {
//     setImages(newImages); // Store the images when selected
//   };

//   return (
//     <div className="h-screen bg-gray-100">
//       <div className="w-1/3 mx-auto">
//         <p className="text-3xl font-bold py-10 text-center text-gray-800">
//           Make your photo album
//         </p>
//         <AlbumDownloader>
//           {({ images, handleFiles, handleDownload }) => (
//             <>
//               <UploadZone onFilesSelected={handleFiles} />
//               <PhotoAlbum/>
//               {/* {images.length > 0 && (
//                 <>
//                   <PreviewGallery images={images} handleDownload={() => handleDownload(images)} />
//                 </>
//               )} */}
//               {images && images.length > 0 && (
//                 <PreviewGallery images={images} handleDownload={() => handleDownload(images)} />
//               )}
//             </>
//           )}
//         </AlbumDownloader>
//       </div>
//     </div>
//   );
// }

// export default App;



// import React, { useState } from 'react';
// import UploadZone from './components/UploadZone';  // Handles file uploading and creation of album
// import PhotoAlbum from './components/PhotoAlbum';  // Handles showing the organized photos
// import AlbumDownloader from './components/AlbumDownloader';  // Handles downloading the organized photos

// function App() {
//   const [organizedPhotos, setOrganizedPhotos] = useState([]);  // Stores organized photos
//   const [tempDir, setTempDir] = useState(null);  // Temporary directory for downloading
//   const [isAlbumCreated, setIsAlbumCreated] = useState(false);  // Tracks if the album is created

//   // Handles when album is created and ready for preview and download
//   const onAlbumCreated = (organizedPhotos, tempDir) => {
//     setOrganizedPhotos(organizedPhotos);  // Set organized photos for preview
//     setTempDir(tempDir);  // Save temp directory for download
//     setIsAlbumCreated(true);  // Mark the album as created
//   };

//   return (
//     <div className="container mx-auto p-4">
//       <h1 className="text-3xl font-bold mb-4">Photo Album Creator</h1>
      
//       {/* UploadZone handles the file selection and album creation */}
//       <UploadZone onAlbumCreated={onAlbumCreated} onFilesSelected={handleFilesSelected} />

//       {/* Show the organized album once it's created */}
//       {isAlbumCreated && (
//         <div>
//           <h2 className="text-2xl font-semibold mb-4">Preview Your Organized Album</h2>
//           <PhotoAlbum organizedPhotos={organizedPhotos} />
//           <AlbumDownloader tempDir={tempDir} />
//         </div>
//       )}
//     </div>
//   );
// }

// export default App;



import React, { useState } from 'react';
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

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Photo Album Creator</h1>
      
      {/* UploadZone handles the file selection and album creation */}
      <UploadZone onAlbumCreated={onAlbumCreated} onFilesSelected={handleFilesSelected} />

      {/* Show the organized album once it's created */}
      {isAlbumCreated && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Preview Your Organized Album</h2>
          <PhotoAlbum organizedPhotos={organizedPhotos} />
          <AlbumDownloader tempDir={tempDir} />
        </div>
      )}
    </div>
  );
}

export default App;
