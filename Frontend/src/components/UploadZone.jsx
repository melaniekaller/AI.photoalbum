import React, { useRef } from 'react';

const UploadZone = ({ onFilesSelected }) => {
  const fileInputRef = useRef(null);

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const files = [...event.dataTransfer.files];
    const images = files.filter(file => file.type.startsWith('image/'));
    onFilesSelected(images);
  };

  const handleFileChange = (event) => {
    const files = [...event.target.files];
    const images = files.filter(file => file.type.startsWith('image/'));
    onFilesSelected(images);
  };

  const handleClick = () => {
    fileInputRef.current.click();
  };

  return (
    <div
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className="border-2 border-dashed border-gray-300 bg-white p-10 text-center rounded-lg shadow-md cursor-pointer"
    >
      <p className="text-lg font-medium text-gray-600">
        Drag and drop or <br /> click to select folders and files
      </p>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        directory=""
        webkitdirectory="true"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

export default UploadZone;
