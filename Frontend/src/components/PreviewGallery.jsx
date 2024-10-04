import React from 'react';

const PreviewGallery = ({ images }) => {
  return (
    <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {images.map((image, index) => (
        <div key={index} className="bg-white p-2 shadow rounded-md">
          <img
            src={image.src}
            alt={image.name}
            className="h-32 w-full object-cover rounded-md"
          />
          <p className="text-sm mt-2 text-gray-600 text-center">{image.name}</p>
        </div>
      ))}
    </div>
  );
};

export default PreviewGallery;
