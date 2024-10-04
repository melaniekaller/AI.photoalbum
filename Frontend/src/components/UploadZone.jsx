import React from 'react';

const UploadZone = ({ onFilesSelected }) => {
  const handleDrop = (event) => {
    event.preventDefault();
    const files = [...event.dataTransfer.files];
    const images = files.filter(file => file.type.startsWith('image/'));
    onFilesSelected(images);
  };

  const handleFileChange = (event) => {
    const files = [...event.target.files];
    const images = files.filter(file => file.type.startsWith('image/'));
    onFilesSelected(images);
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="border-2 border-dashed border-gray-300 bg-white p-10 text-center rounded-lg shadow-md"
    >
      <p className="text-lg font-medium text-gray-600">
        Dra och släpp dina mappar här eller <br /> klicka för att välja filer
      </p>
      <input
        type="file"
        multiple
        directory="" // Viktigt för att välja mappar
        webkitdirectory="true"
        onChange={handleFileChange}
        className="opacity-0 absolute w-full h-full cursor-pointer"
      />
    </div>
  );
};

export default UploadZone;
