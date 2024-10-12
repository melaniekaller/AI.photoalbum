import React, { useRef, useState } from 'react';
import { FolderIcon } from '@heroicons/react/24/outline';

const UploadZone = ({ onFilesSelected, onCreateAlbum }) => {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFolders, setSelectedFolders] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [images, setImages] = useState([]);

  
  const handleDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const items = event.dataTransfer.items;
    const folders = [];
    const files = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i].webkitGetAsEntry();
      if (item.isDirectory) {
        folders.push(item.name);
        await traverseDirectory(item, files);
      }
    }
    updateSelectedFolders(folders);
    handleFiles(files);
  };

  // const traverseDirectory = async (directoryEntry, files) => {
  //   const reader = directoryEntry.createReader();  // Create a directory reader for the given directory
  //   reader.readEntries((entries) => {              // Read the entries (files or subdirectories) in this directory
  //     entries.forEach((entry) => {                 // Iterate over all entries (files and directories)
  //       if (entry.isFile) {                        // If the entry is a file
  //         entry.file((file) => {                   // Use the file() method to access the actual file object
  //           files.push(file);                      // Push the file into the files array
  //         });
  //       } else if (entry.isDirectory) {            // If the entry is another directory (subfolder)
  //         traverseDirectory(entry, files);         // Recursively call traverseDirectory to handle this subdirectory
  //       }
  //     });
  //   });
  // };

  const traverseDirectory = async (directoryEntry, files) => {
    const reader = directoryEntry.createReader();
    const readEntries = () => {
      return new Promise((resolve, reject) => {
        reader.readEntries((entries) => {
          if (entries.length === 0) {
            resolve();
          } else {
            Promise.all(
              entries.map((entry) => {
                if (entry.isFile) {
                  return new Promise((res) => {
                    entry.file((file) => {
                      files.push(file); // Collect file
                      res();
                    });
                  });
                } else if (entry.isDirectory) {
                  return traverseDirectory(entry, files); // Recursively process subdirectories
                }
                return Promise.resolve(); // In case of empty entry
              })
            ).then(resolve).catch(reject);
          }
        });
      });
    };
    await readEntries();
  };
  
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

  // const handleFileChange = (event) => {
  //   const files = [...event.target.files];
  //   onFilesSelected(files);
  //   const folders = Array.from(new Set(files.map(file => file.webkitRelativePath.split('/')[0])));
  //   updateSelectedFolders(folders);
  // };

  const updateSelectedFolders = (newFolders) => {
    const updatedFolders = [...new Set([...selectedFolders, ...newFolders])];
    setSelectedFolders(updatedFolders);
    onFilesSelected(updatedFolders);
  };

  const handleClick = () => {
    fileInputRef.current.click();
  };

  const handleDragEnter = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleCreateAlbum = async () => {
    setIsCreating(true);
    const formData = new FormData();
    const fileList = fileInputRef.current.files;
    for (let i = 0; i < fileList.length; i++) {
      formData.append('images', fileList[i]);
    }
  
    try {
      const response = await fetch('http://localhost:5000/api/upload-and-organize', {
        method: 'POST',
        body: formData,
      });
  
      if (response.ok) {
        const result = await response.json();
        console.log('Album created successfully', result);
      } else {
        console.error('Error creating album:', response.statusText);
      }
    } catch (error) {
      console.error('Error sending data to backend:', error);
    } finally {
      setIsCreating(false);
    }
  };
  

  return (
    <div>
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'
        } p-6 text-center rounded-lg shadow-md cursor-pointer transition-colors duration-300`}
      >
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
        <input
          ref={fileInputRef}
          type="file"
          multiple
          directory=""
          webkitdirectory="true"
          onChange={(e) => handleFiles([...e.target.files])}
          className="hidden"
        />
      </div>
      {selectedFolders.length > 0 && (
        <div className="text-center mt-6">
          <button
            onClick={handleCreateAlbum}
            disabled={isCreating}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            {isCreating ? 'Creating Album...' : 'Make My Photo Album'}
          </button>
        </div>
      )}
    </div>
  );
};

export default UploadZone;
