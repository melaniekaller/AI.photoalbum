// import React, { useRef, useState } from 'react';
// import { FolderIcon } from '@heroicons/react/24/outline';

// const UploadZone = ({ onFilesSelected, onCreateAlbum }) => {
//   const fileInputRef = useRef(null);
//   const [isDragging, setIsDragging] = useState(false);
//   const [selectedFolders, setSelectedFolders] = useState([]);
//   const [isCreating, setIsCreating] = useState(false);
//   const [images, setImages] = useState([]);

  
//   const handleDrop = async (event) => {
//     event.preventDefault();
//     event.stopPropagation();
//     setIsDragging(false);

//     const items = event.dataTransfer.items;
//     const folders = [];
//     const files = [];

//     for (let i = 0; i < items.length; i++) {
//       const item = items[i].webkitGetAsEntry();
//       if (item.isDirectory) {
//         folders.push(item.name);
//         await traverseDirectory(item, files);
//       }
//     }
//     updateSelectedFolders(folders);
//     handleFiles(files);
//   };

//   // const traverseDirectory = async (directoryEntry, files) => {
//   //   const reader = directoryEntry.createReader();  // Create a directory reader for the given directory
//   //   reader.readEntries((entries) => {              // Read the entries (files or subdirectories) in this directory
//   //     entries.forEach((entry) => {                 // Iterate over all entries (files and directories)
//   //       if (entry.isFile) {                        // If the entry is a file
//   //         entry.file((file) => {                   // Use the file() method to access the actual file object
//   //           files.push(file);                      // Push the file into the files array
//   //         });
//   //       } else if (entry.isDirectory) {            // If the entry is another directory (subfolder)
//   //         traverseDirectory(entry, files);         // Recursively call traverseDirectory to handle this subdirectory
//   //       }
//   //     });
//   //   });
//   // };

//   const traverseDirectory = async (directoryEntry, files) => {
//     const reader = directoryEntry.createReader();
//     const readEntries = () => {
//       return new Promise((resolve, reject) => {
//         reader.readEntries((entries) => {
//           if (entries.length === 0) {
//             resolve();
//           } else {
//             Promise.all(
//               entries.map((entry) => {
//                 if (entry.isFile) {
//                   return new Promise((res) => {
//                     entry.file((file) => {
//                       files.push(file); // Collect file
//                       res();
//                     });
//                   });
//                 } else if (entry.isDirectory) {
//                   return traverseDirectory(entry, files); // Recursively process subdirectories
//                 }
//                 return Promise.resolve(); // In case of empty entry
//               })
//             ).then(resolve).catch(reject);
//           }
//         });
//       });
//     };
//     await readEntries();
//   };
  
//   const handleFiles = (uploadedFiles) => {
//     const newImages = uploadedFiles.map((file) => {
//       return {
//         src: URL.createObjectURL(file),
//         name: file.name,
//         file: file, // Store the actual file object
//       };
//     });
//     setImages([...images, ...newImages]);
//   };

//   // const handleFileChange = (event) => {
//   //   const files = [...event.target.files];
//   //   onFilesSelected(files);
//   //   const folders = Array.from(new Set(files.map(file => file.webkitRelativePath.split('/')[0])));
//   //   updateSelectedFolders(folders);
//   // };

//   const updateSelectedFolders = (newFolders) => {
//     const updatedFolders = [...new Set([...selectedFolders, ...newFolders])];
//     setSelectedFolders(updatedFolders);
//     onFilesSelected(updatedFolders);
//   };

//   const handleClick = () => {
//     fileInputRef.current.click();
//   };

//   const handleDragEnter = (event) => {
//     event.preventDefault();
//     event.stopPropagation();
//     setIsDragging(true);
//   };

//   const handleDragLeave = (event) => {
//     event.preventDefault();
//     event.stopPropagation();
//     setIsDragging(false);
//   };

//   const handleCreateAlbum = async () => {
//     setIsCreating(true);
//     const formData = new FormData();
//     const fileList = fileInputRef.current.files;
//     for (let i = 0; i < fileList.length; i++) {
//       formData.append('images', fileList[i]);
//     }
  
//     try {
//       const response = await fetch('http://127.0.0.1:8000/api/upload-and-organize', {
//         method: 'POST',
//         body: formData,
//       });
  
//       if (response.ok) {
//         const result = await response.json();
//         console.log('Album created successfully', result);
//       } else {
//         console.error('Error creating album:', response.statusText);
//       }
//     } catch (error) {
//       console.error('Error sending data to backend:', error);
//     } finally {
//       setIsCreating(false);
//     }
//   };
  

//   return (
//     <div>
//       <div
//         onClick={handleClick}
//         onDrop={handleDrop}
//         onDragOver={(e) => {
//           e.preventDefault();
//           e.stopPropagation();
//         }}
//         onDragEnter={handleDragEnter}
//         onDragLeave={handleDragLeave}
//         className={`border-2 border-dashed ${
//           isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'
//         } p-6 text-center rounded-lg shadow-md cursor-pointer transition-colors duration-300`}
//       >
//         {selectedFolders.length === 0 ? (
//           <p className="text-lg font-medium text-gray-600">
//             {isDragging ? 'Drop folders here' : 'Drag and drop or click to select folders'}
//           </p>
//         ) : (
//           <div className="flex flex-wrap justify-center gap-4">
//             {selectedFolders.map((folder, index) => (
//               <div key={index} className="flex flex-col items-center">
//                 <FolderIcon className="w-16 h-16 text-yellow-500" />
//                 <span className="mt-2 text-sm text-gray-600 max-w-[100px] truncate">{folder}</span>
//               </div>
//             ))}
//           </div>
//         )}
//         <input
//           ref={fileInputRef}
//           type="file"
//           multiple
//           directory=""
//           webkitdirectory="true"
//           onChange={(e) => handleFiles([...e.target.files])}
//           className="hidden"
//         />
//       </div>
//       {selectedFolders.length > 0 && (
//         <div className="text-center mt-6">
//           <button
//             onClick={handleCreateAlbum}
//             disabled={isCreating}
//             className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
//           >
//             {isCreating ? 'Creating Album...' : 'Make My Photo Album'}
//           </button>
//         </div>
//       )}
//     </div>
//   );
// };

// export default UploadZone;





















































// // latest version:

// import React, { useRef, useState } from 'react';
// import { FolderIcon } from '@heroicons/react/24/outline';

// const UploadZone = ({ onFilesSelected, onCreateAlbum }) => {
//   const fileInputRef = useRef(null);
//   const [isDragging, setIsDragging] = useState(false);
//   const [selectedFolders, setSelectedFolders] = useState([]);
//   const [isCreating, setIsCreating] = useState(false);
//   const [images, setImages] = useState([]);

//   // Handle dropped files and folders
//   const handleDrop = async (event) => {
//     event.preventDefault();
//     event.stopPropagation();
//     setIsDragging(false);

//     const items = event.dataTransfer.items;
//     const folders = [];
//     const files = [];

//     for (let i = 0; i < items.length; i++) {
//       const item = items[i].webkitGetAsEntry();
//       if (item.isDirectory) {
//         folders.push(item.name);
//         await traverseDirectory(item, files); // Traverse directories and collect files
//       }
//     }
//     updateSelectedFolders(folders);
//     handleFiles(files); // Handle the files from the folders
//   };

//   // Traverse directories recursively and collect files
//   const traverseDirectory = async (directoryEntry, files) => {
//     const reader = directoryEntry.createReader();
//     const readEntries = () => {
//       return new Promise((resolve, reject) => {
//         reader.readEntries((entries) => {
//           if (entries.length === 0) {
//             resolve();
//           } else {
//             Promise.all(
//               entries.map((entry) => {
//                 if (entry.isFile) {
//                   return new Promise((res) => {
//                     entry.file((file) => {
//                       files.push(file); // Collect file
//                       res();
//                     });
//                   });
//                 } else if (entry.isDirectory) {
//                   return traverseDirectory(entry, files); // Recursively process subdirectories
//                 }
//                 return Promise.resolve(); // In case of empty entry
//               })
//             ).then(resolve).catch(reject);
//           }
//         });
//       });
//     };
//     await readEntries();
//   };

//   // Handle both dropped and selected files
//   const handleFiles = (uploadedFiles) => {
//     const newImages = uploadedFiles.map((file) => ({
//       src: URL.createObjectURL(file),
//       name: file.name,
//       file: file, // Store the actual file object
//     }));

//     const allImages = [...images, ...newImages];
//     setImages(allImages); // Update local state with new images
//     onFilesSelected(allImages); // Pass the new images to the parent via callback
//   };

//   // Update selected folders, used for display purposes
//   const updateSelectedFolders = (newFolders) => {
//     const updatedFolders = [...new Set([...selectedFolders, ...newFolders])];
//     setSelectedFolders(updatedFolders);
//   };

//   // Handle manual file selection from input field
//   const handleFileChange = (event) => {
//     const files = [...event.target.files];
//     handleFiles(files); // Process selected files
//   };

//   // Trigger file input click event
//   const handleClick = () => {
//     fileInputRef.current.click();
//   };

//   const handleDragEnter = (event) => {
//     event.preventDefault();
//     event.stopPropagation();
//     setIsDragging(true);
//   };

//   const handleDragLeave = (event) => {
//     event.preventDefault();
//     event.stopPropagation();
//     setIsDragging(false);
//   };

//   // Create album and upload images to the server
//   const handleCreateAlbum = async () => {
//     setIsCreating(true);
//     const formData = new FormData();

//     // Combine both input files and drag-and-drop files
//     images.forEach((image) => {
//       formData.append('images', image.file);
//     });

//     try {
//       const response = await fetch('http://localhost:5000/api/upload-and-organize', {
//         method: 'POST',
//         body: formData,
//       });

//       if (response.ok) {
//         const result = await response.json();
//         console.log('Album created successfully', result);
//       } else {
//         console.error('Error creating album:', response.statusText);
//       }
//     } catch (error) {
//       console.error('Error sending data to backend:', error);
//     } finally {
//       setIsCreating(false);
//     }
//   };

//   return (
//     <div>
//       <div
//         onClick={handleClick}
//         onDrop={handleDrop}
//         onDragOver={(e) => {
//           e.preventDefault();
//           e.stopPropagation();
//         }}
//         onDragEnter={handleDragEnter}
//         onDragLeave={handleDragLeave}
//         className={`border-2 border-dashed ${
//           isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'
//         } p-6 text-center rounded-lg shadow-md cursor-pointer transition-colors duration-300`}
//       >
//         {selectedFolders.length === 0 ? (
//           <p className="text-lg font-medium text-gray-600">
//             {isDragging ? 'Drop folders here' : 'Drag and drop or click to select folders'}
//           </p>
//         ) : (
//           <div className="flex flex-wrap justify-center gap-4">
//             {selectedFolders.map((folder, index) => (
//               <div key={index} className="flex flex-col items-center">
//                 <FolderIcon className="w-16 h-16 text-yellow-500" />
//                 <span className="mt-2 text-sm text-gray-600 max-w-[100px] truncate">{folder}</span>
//               </div>
//             ))}
//           </div>
//         )}
//         <input
//           ref={fileInputRef}
//           type="file"
//           multiple
//           directory=""
//           webkitdirectory="true"
//           onChange={handleFileChange} // Process manual file selection
//           className="hidden"
//         />
//       </div>
//       {selectedFolders.length > 0 && (
//         <div className="text-center mt-6">
//           <button
//             onClick={handleCreateAlbum}
//             disabled={isCreating}
//             className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
//           >
//             {isCreating ? 'Creating Album...' : 'Make My Photo Album'}
//           </button>
//         </div>
//       )}
//     </div>
//   );
// };

// export default UploadZone;






// import React, { useState, useRef } from 'react';
// import { FolderIcon } from '@heroicons/react/24/outline';

// const UploadZone = ({ onAlbumCreated }) => {
//   const fileInputRef = useRef(null);
//   const [isDragging, setIsDragging] = useState(false);
//   const [isCreating, setIsCreating] = useState(false);
//   const [images, setImages] = useState([]);
//   const [selectedFolders, setSelectedFolders] = useState([]); // Lägg till selectedFolders state

//   // Handle file upload or drag-and-drop
//   const handleFiles = (uploadedFiles) => {
//     const newImages = uploadedFiles.map((file) => ({
//       src: URL.createObjectURL(file),
//       name: file.name,
//       file: file,
//     }));
//     setImages([...images, ...newImages]);  // Add new images to the state
//   };

//   // Handle files dropped into the zone
//   const handleDrop = async (event) => {
//     event.preventDefault();
//     setIsDragging(false);
    
//     const files = [];
//     const folders = []; // For folder names

//     for (let i = 0; i < event.dataTransfer.items.length; i++) {
//       const item = event.dataTransfer.items[i].webkitGetAsEntry();
//       if (item && item.isDirectory) {
//         folders.push(item.name);  // Collect folder name
//       } else if (item) {
//         files.push(item.getAsFile());  // Collect file
//       }
//     }

//     setSelectedFolders(folders);  // Save folder names
//     handleFiles(files);  // Process files
//   };

//   // Upload images and create album
//   const handleCreateAlbum = async () => {
//     setIsCreating(true);
//     const formData = new FormData();
//     images.forEach((image) => formData.append('images', image.file));

//     try {
//       const response = await fetch('http://127.0.0.1:8000/api/upload-and-organize', {
//         method: 'POST',
//         body: formData,
//       });

//       if (response.ok) {
//         const result = await response.json();
//         onAlbumCreated(result.preview, result.temp_dir);  // Pass organized photos to App.jsx
//       } else {
//         console.error('Error creating album:', response.statusText);
//       }
//     } catch (error) {
//       console.error('Error uploading files:', error);
//     } finally {
//       setIsCreating(false);
//     }
//   };

//   return (
//     <div>
//       <div
//         onClick={() => fileInputRef.current.click()}
//         onDrop={handleDrop}
//         onDragOver={(e) => e.preventDefault()}
//         onDragEnter={() => setIsDragging(true)}
//         onDragLeave={() => setIsDragging(false)}
//         className={`border-2 border-dashed ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'} p-6 text-center rounded-lg shadow-md cursor-pointer`}
//       >
//         <input
//           ref={fileInputRef}
//           type="file"
//           multiple
//           directory=""
//           webkitdirectory="true"
//           onChange={(e) => handleFiles([...e.target.files])}
//           className="hidden"
//         />
//         {selectedFolders.length === 0 ? (
//           <p className="text-lg font-medium text-gray-600">
//             {isDragging ? 'Drop folders here' : 'Drag and drop or click to select folders'}
//           </p>
//         ) : (
//           <div className="flex flex-wrap justify-center gap-4">
//             {selectedFolders.map((folder, index) => (
//               <div key={index} className="flex flex-col items-center">
//                 <FolderIcon className="w-16 h-16 text-yellow-500" />
//                 <span className="mt-2 text-sm text-gray-600 max-w-[100px] truncate">{folder}</span>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>
  
//       {images.length > 0 && (
//         <div className="text-center mt-6">
//           <button
//             onClick={handleCreateAlbum}
//             disabled={isCreating}
//             className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
//           >
//             {isCreating ? 'Creating Album...' : 'Create My Photo Album'}
//           </button>
//         </div>
//       )}
//     </div>
//   );
// };

// export default UploadZone;











// import React, { useState, useRef } from 'react';
// import { FolderIcon } from '@heroicons/react/24/outline';

// const UploadZone = ({ onAlbumCreated }) => {
//   const fileInputRef = useRef(null);
//   const [isDragging, setIsDragging] = useState(false);
//   const [isCreating, setIsCreating] = useState(false);
//   const [images, setImages] = useState([]); // Stores image file objects
//   const [selectedFolders, setSelectedFolders] = useState([]); // State for tracking selected folders

//   // Handle file upload or drag-and-drop
//   const handleFiles = (uploadedFiles) => {
//     const newImages = uploadedFiles.map((file) => ({
//       src: URL.createObjectURL(file),
//       name: file.name,
//       file: file,
//     }));
//     setImages([...images, ...newImages]); // Add new images to the state
//   };

//   // Handle files dropped into the zone
//   const handleDrop = async (event) => {
//     event.preventDefault();
//     setIsDragging(false);

//     const items = event.dataTransfer.items;
//     const files = [];
//     const folders = [];

//     for (let i = 0; i < items.length; i++) {
//       const item = items[i].webkitGetAsEntry();
//       if (item.isDirectory) {
//         folders.push(item.name);
//       } else if (item.isFile) {
//         files.push(items[i].getAsFile());
//       }
//     }

//     setSelectedFolders(folders); // Update the selected folders in the state
//     handleFiles(files);
//   };

//   // Upload images and create album
//   const handleCreateAlbum = async () => {
//     setIsCreating(true);
//     const formData = new FormData();
//     images.forEach((image) => formData.append('images', image.file));

//     try {
//       const response = await fetch('http://127.0.0.1:8000/api/upload-and-organize', {
//         method: 'POST',
//         body: formData,
//       });

//       if (response.ok) {
//         const result = await response.json();
//         onAlbumCreated(result.preview, result.temp_dir); // Pass organized photos to App.jsx
//       } else {
//         console.error('Error creating album:', response.statusText);
//       }
//     } catch (error) {
//       console.error('Error uploading files:', error);
//     } finally {
//       setIsCreating(false);
//     }
//   };

//   return (
//     <div>
//       <div
//         onClick={() => fileInputRef.current.click()}
//         onDrop={handleDrop}
//         onDragOver={(e) => e.preventDefault()}
//         onDragEnter={() => setIsDragging(true)}
//         onDragLeave={() => setIsDragging(false)}
//         className={`border-2 border-dashed ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'} p-6 text-center rounded-lg shadow-md cursor-pointer`}
//       >
//         <input
//           ref={fileInputRef}
//           type="file"
//           multiple
//           directory=""
//           webkitdirectory="true"
//           onChange={(e) => handleFiles([...e.target.files])}
//           className="hidden"
//         />
//         {selectedFolders.length === 0 ? (
//           <p className="text-lg font-medium text-gray-600">
//             {isDragging ? 'Drop folders here' : 'Drag and drop or click to select folders'}
//           </p>
//         ) : (
//           <div className="flex flex-wrap justify-center gap-4">
//             {selectedFolders.map((folder, index) => (
//               <div key={index} className="flex flex-col items-center">
//                 <FolderIcon className="w-16 h-16 text-yellow-500" />
//                 <span className="mt-2 text-sm text-gray-600 max-w-[100px] truncate">{folder}</span>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>

//       {images.length > 0 && (
//         <div className="text-center mt-6">
//           <button
//             onClick={handleCreateAlbum}
//             disabled={isCreating}
//             className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
//           >
//             {isCreating ? 'Creating Album...' : 'Create My Photo Album'}
//           </button>
//         </div>
//       )}
//     </div>
//   );
// };

// export default UploadZone;


// import React, { useState, useRef } from 'react';
// import { FolderIcon } from '@heroicons/react/24/outline';

// const UploadZone = ({ onAlbumCreated }) => {
//   const fileInputRef = useRef(null);
//   const [isDragging, setIsDragging] = useState(false);
//   const [isCreating, setIsCreating] = useState(false);
//   const [images, setImages] = useState([]);
//   const [selectedFolders, setSelectedFolders] = useState([]);

//   // Handle file upload or drag-and-drop
//   const handleFiles = (uploadedFiles) => {
//     const newImages = uploadedFiles.map((file) => ({
//       src: URL.createObjectURL(file),
//       name: file.name,
//       file: file,
//     }));
//     setImages((prevImages) => [...prevImages, ...newImages]);  // Add new images to the state
//   };

//   // Handle files dropped into the zone
//   const handleDrop = async (event) => {
//     event.preventDefault();
//     setIsDragging(false);

//     const files = [];
//     const folders = []; // For folder names

//     for (let i = 0; i < event.dataTransfer.items.length; i++) {
//       const item = event.dataTransfer.items[i].webkitGetAsEntry();
//       if (item && item.isDirectory) {
//         folders.push(item.name);  // Collect folder name
//         await traverseDirectory(item, files);  // Traverse directories and collect files
//       } else if (item) {
//         files.push(item.getAsFile());  // Collect file
//       }
//     }

//     setSelectedFolders(folders);  // Save folder names
//     handleFiles(files);  // Process files
//   };

//   // Traverse directories to collect all files
//   const traverseDirectory = async (directoryEntry, files) => {
//     const reader = directoryEntry.createReader();
//     const readEntries = () => {
//       return new Promise((resolve, reject) => {
//         reader.readEntries((entries) => {
//           if (entries.length === 0) {
//             resolve();
//           } else {
//             Promise.all(
//               entries.map((entry) => {
//                 if (entry.isFile) {
//                   return new Promise((res) => {
//                     entry.file((file) => {
//                       files.push(file);  // Add file to the list
//                       res();
//                     });
//                   });
//                 } else if (entry.isDirectory) {
//                   return traverseDirectory(entry, files);  // Recursively traverse directories
//                 }
//                 return Promise.resolve();  // Resolve empty entries
//               })
//             ).then(resolve).catch(reject);
//           }
//         });
//       });
//     };
//     await readEntries();
//   };

//   // Upload images and create the album
//   const handleCreateAlbum = async () => {
//     setIsCreating(true);
//     const formData = new FormData();
//     images.forEach((image) => formData.append('files', image.file));

//     try {
//       const response = await fetch('http://127.0.0.1:8000/api/upload-and-organize', {
//         method: 'POST',
//         body: formData,
//       });

//       if (response.ok) {
//         const result = await response.json();
//         onAlbumCreated(result.preview, result.temp_dir);  // Pass organized photos to parent
//       } else {
//         console.error('Error creating album:', response.statusText);
//       }
//     } catch (error) {
//       console.error('Error uploading files:', error);
//     } finally {
//       setIsCreating(false);
//     }
//   };

//   return (
//     <div>
//       <div
//         onClick={() => fileInputRef.current.click()}
//         onDrop={handleDrop}
//         onDragOver={(e) => e.preventDefault()}
//         onDragEnter={() => setIsDragging(true)}
//         onDragLeave={() => setIsDragging(false)}
//         className={`border-2 border-dashed ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'} p-6 text-center rounded-lg shadow-md cursor-pointer`}
//       >
//         <input
//           ref={fileInputRef}
//           type="file"
//           multiple
//           directory=""
//           webkitdirectory="true"
//           onChange={(e) => handleFiles([...e.target.files])}
//           className="hidden"
//         />
//         {selectedFolders.length === 0 && images.length === 0 ? (
//           <p className="text-lg font-medium text-gray-600">
//             {isDragging ? 'Drop folders/files here' : 'Drag and drop or click to select folders/files'}
//           </p>
//         ) : (
//           <div className="flex flex-wrap justify-center gap-4">
//             {selectedFolders.map((folder, index) => (
//               <div key={index} className="flex flex-col items-center">
//                 <FolderIcon className="w-16 h-16 text-yellow-500" />
//                 <span className="mt-2 text-sm text-gray-600 max-w-[100px] truncate">{folder}</span>
//               </div>
//             ))}
//             {images.map((image, index) => (
//               <div key={index} className="flex flex-col items-center">
//                 <img src={image.src} alt={image.name} className="w-16 h-16 object-cover rounded" />
//                 <span className="mt-2 text-sm text-gray-600 max-w-[100px] truncate">{image.name}</span>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>

//       {images.length > 0 && (
//         <div className="text-center mt-6">
//           <button
//             onClick={handleCreateAlbum}
//             disabled={isCreating}
//             className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
//           >
//             {isCreating ? 'Creating Album...' : 'Create My Photo Album'}
//           </button>
//         </div>
//       )}
//     </div>
//   );
// };

// export default UploadZone;

import React, { useState, useRef } from 'react';
import { FolderIcon } from '@heroicons/react/24/outline';

const UploadZone = ({ onAlbumCreated }) => {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [images, setImages] = useState([]);  // Stores the image files
  const [selectedFolders, setSelectedFolders] = useState([]);  // Stores folder names

  // Handle file upload or drag-and-drop
  const handleFiles = (uploadedFiles) => {
    // Only add files, but we don't show them here
    const newImages = uploadedFiles.map((file) => ({
      src: URL.createObjectURL(file),
      name: file.name,
      file: file,
    }));
    setImages([...images, ...newImages]);  // Add files to state, but we won't display them here
  };

  // Handle folder drop
  const handleDrop = async (event) => {
    event.preventDefault();
    setIsDragging(false);

    const folders = [];  // Stores folder names
    const files = [];

    for (let i = 0; i < event.dataTransfer.items.length; i++) {
      const item = event.dataTransfer.items[i].webkitGetAsEntry();
      if (item && item.isDirectory) {
        folders.push(item.name);  // Only store folder names here
      } else if (item) {
        files.push(item.getAsFile());  // Collect file for actual upload
      }
    }

    setSelectedFolders(folders);  // Display folders
    handleFiles(files);  // Process the files
  };

  // Upload images and create album
  const handleCreateAlbum = async () => {
    setIsCreating(true);
    const formData = new FormData();
    
    images.forEach((image) => formData.append('files', image.file));  // Append actual file objects to formData

    try {
        const response = await fetch('http://127.0.0.1:8000/api/upload-and-organize', {
            method: 'POST',
            body: formData,
        });

        if (response.ok) {
            const result = await response.json();
            console.log('Album created:', result);
            onAlbumCreated(result.preview, result.temp_dir);  // Pass organized photos to App.jsx
        } else {
            console.error('Error creating album:', response.statusText);
        }
    } catch (error) {
        console.error('Error uploading files:', error);
    } finally {
        setIsCreating(false);
    }
};

  return (
    <div>
      <div
        onClick={() => fileInputRef.current.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={() => setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
        className={`border-2 border-dashed ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'} p-6 text-center rounded-lg shadow-md cursor-pointer`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          directory=""
          webkitdirectory="true"
          onChange={(e) => handleFiles([...e.target.files])}
          className="hidden"
        />
        {selectedFolders.length === 0 ? (
          <p className="text-lg font-medium text-gray-600">
            {isDragging ? 'Drop folders here' : 'Drag and drop or click to select folders'}
          </p>
        ) : (
          <div className="flex flex-wrap justify-center gap-4">
            {selectedFolders.map((folder, index) => (
              <div key={index} className="flex flex-col items-center">
                <FolderIcon className="w-16 h-16 text-yellow-500" />
                <span className="mt-2 text-sm text-gray-600 max-w-[100px] truncate">{folder}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedFolders.length > 0 && (
        <div className="text-center mt-6">
          <button
            onClick={handleCreateAlbum}
            disabled={isCreating}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            {isCreating ? 'Creating Album...' : 'Create My Photo Album'}
          </button>
        </div>
      )}
    </div>
  );
};

export default UploadZone;

