import React, { useState, useRef } from 'react';
import { FolderIcon } from '@heroicons/react/24/outline';

const UploadZone = ({ onAlbumCreated }) => {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [images, setImages] = useState([]);  // Stores the image files
  const [selectedFolders, setSelectedFolders] = useState([]);  // Stores folder names
  const [fileList, setFileList] = useState([]);  // Stores the file objects for FormData

  // Log when user uploads files
  const logFiles = (files) => {
    console.log('Uploaded files:');
    files.forEach((file) => console.log(file.name));
  };

  // Handle file upload or drag-and-drop
  const handleFiles = (uploadedFiles) => {
    const newImages = uploadedFiles.map((file) => ({
      src: URL.createObjectURL(file),
      name: file.name,
      file: file,
    }));

    setImages([...images, ...newImages]);  // Add files to state
    setFileList([...fileList, ...uploadedFiles]);  // Keep track of files for FormData
    logFiles(uploadedFiles);
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    setIsDragging(false);

    const items = event.dataTransfer.items;
    const files = [];
    const folders = [];

    const traverseFileTree = (item, path = '') => {
      return new Promise((resolve) => {
        if (item.isFile) {
          item.file((file) => {
            file.fullPath = path + file.name;  // Optionally add full path
            files.push(file);
            resolve();
          });
        } else if (item.isDirectory) {
          const dirReader = item.createReader();
          folders.push(path + item.name);
          dirReader.readEntries(async (entries) => {
            for (const entry of entries) {
              await traverseFileTree(entry, path + item.name + '/');
            }
            resolve();
          });
        }
      });
    };

    const traversePromises = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i].webkitGetAsEntry();
      if (item) {
        traversePromises.push(traverseFileTree(item));
      }
    }

    await Promise.all(traversePromises);

    setSelectedFolders(folders);
    handleFiles(files);
  };

  // Upload images and create album
  const handleCreateAlbum = async () => {
    setIsCreating(true);
    console.log('Creating album...');

    const formData = new FormData();
    fileList.forEach((file) => formData.append('files', file));  // Append actual file objects to FormData

    try {
      console.log('Sending files to backend...');
      const response = await fetch('http://127.0.0.1:8000/api/upload-and-organize', {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
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
            {isDragging ? 'Drop folders or files here' : 'Drag and drop or click to select folders or files'}
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

      {(selectedFolders.length > 0 || fileList.length > 0) && (
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


// claude:
// import React, { useState, useRef } from 'react';
// import { FolderIcon, FileIcon } from 'lucide-react';

// const UploadZone = ({ onAlbumCreated }) => {
//   const fileInputRef = useRef(null);
//   const [isDragging, setIsDragging] = useState(false);
//   const [isCreating, setIsCreating] = useState(false);
//   const [selectedItems, setSelectedItems] = useState([]);
//   const [fileList, setFileList] = useState([]);

//   const logUpload = (items) => {
//     console.log('Uploaded items:');
//     items.forEach((item) => console.log(item.name));
//   };

//   const handleFiles = (items) => {
//     const newItems = [];
//     const newFiles = [];

//     items.forEach((item) => {
//       if (item.type === 'folder') {
//         newItems.push({ name: item.name, type: 'folder' });
//       } else {
//         newItems.push({ name: item.name, type: 'file' });
//         newFiles.push(item);
//       }
//     });

//     setSelectedItems([...selectedItems, ...newItems]);
//     setFileList([...fileList, ...newFiles]);
//     logUpload(items);
//   };

//   const handleFileInputChange = (event) => {
//     const files = Array.from(event.target.files);
//     handleFiles(files.map(file => ({ name: file.name, type: 'file' })));
//   };

//   const handleDrop = (event) => {
//     event.preventDefault();
//     setIsDragging(false);

//     const items = event.dataTransfer.items;
//     const uploadedItems = [];

//     const processEntry = (entry, path = '') => {
//       return new Promise((resolve) => {
//         if (entry.isFile) {
//           entry.file((file) => {
//             uploadedItems.push({ name: path + file.name, type: 'file' });
//             resolve();
//           });
//         } else if (entry.isDirectory) {
//           uploadedItems.push({ name: path + entry.name, type: 'folder' });
//           const reader = entry.createReader();
//           reader.readEntries((entries) => {
//             Promise.all(entries.map(e => processEntry(e, path + entry.name + '/')))
//               .then(() => resolve());
//           });
//         }
//       });
//     };

//     Promise.all(Array.from(items).map(item => processEntry(item.webkitGetAsEntry())))
//       .then(() => {
//         handleFiles(uploadedItems);
//       });
//   };

//   const handleCreateAlbum = async () => {
//     setIsCreating(true);
//     console.log('Creating album...');

//     const formData = new FormData();
//     fileList.forEach((file) => formData.append('files', file));

//     try {
//       console.log('Sending files to backend...');
//       const response = await fetch('http://127.0.0.1:8000/api/upload-and-organize', {
//         method: 'POST',
//         body: formData,
//       });

//       if (response.ok) {
//         const result = await response.json();
//         console.log('Album created:', result);
//         onAlbumCreated(result.preview, result.temp_dir);
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
//           onChange={handleFileInputChange}
//           className="hidden"
//           webkitdirectory=""
//           directory=""
//         />
//         {selectedItems.length === 0 ? (
//           <p className="text-lg font-medium text-gray-600">
//             {isDragging ? 'Drop folders or files here' : 'Drag and drop or click to select folders or files'}
//           </p>
//         ) : (
//           <div className="flex flex-wrap justify-center gap-4">
//             {selectedItems.map((item, index) => (
//               <div key={index} className="flex flex-col items-center">
//                 {item.type === 'folder' ? (
//                   <FolderIcon className="w-16 h-16 text-yellow-500" />
//                 ) : (
//                   <FileIcon className="w-16 h-16 text-blue-500" />
//                 )}
//                 <span className="mt-2 text-sm text-gray-600 max-w-[100px] truncate">{item.name}</span>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>

//       {selectedItems.length > 0 && (
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