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
    const newFiles = uploadedFiles.filter(
      (file) => !fileList.some((f) => f.name === file.name)
    );
    const newImages = newFiles.map((file) => ({
      src: URL.createObjectURL(file),
      name: file.name,
      file: file,
    }));
  
    setImages([...images, ...newImages]); 
    setFileList([...fileList, ...newFiles]);
    logFiles(newFiles);
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
    // fileList.forEach((file) => formData.append('files', file));  // Append actual file objects to FormData
    fileList.forEach((file) => {
      console.log('File:', file.name, file.size, file.type);
      formData.append('files', file);
    });

    try {
      console.log('FormData contents:');
      for (let [key, value] of formData.entries()) {
        console.log(key, value);
      }

      const response = await fetch('http://127.0.0.1:8000/api/upload-and-organize', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Album created:', result);
        onAlbumCreated(result.preview, result.temp_dir);  // Pass organized photos to App.jsx
      } else {
        const errorText = await response.text();
        console.error('Error creating album:', response.status, errorText);
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