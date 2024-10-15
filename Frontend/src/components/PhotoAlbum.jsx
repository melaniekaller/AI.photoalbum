// import React, { useState, useEffect } from 'react';

// const PhotoAlbum = () => {
//   const [organizedPhotos, setOrganizedPhotos] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     fetchOrganizedPhotos();
//   }, []);

//   const fetchOrganizedPhotos = async () => {
//     try {
//       setLoading(true);
//       const response = await fetch('http://127.0.0.1:5000/api/organized-photos');
//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`);
//       }
//       const data = await response.json();
//       setOrganizedPhotos(data);
//       setLoading(false);
//     } catch (error) {
//       console.error('Error fetching organized photos:', error);
//       setError('Failed to load photos. Please try again later.');
//       setLoading(false);
//     }
//   };

//   const changeBestPhoto = (clusterIndex, newBestIndex) => {
//     setOrganizedPhotos(prevPhotos => {
//       const newPhotos = [...prevPhotos];
//       const cluster = newPhotos[clusterIndex];
//       const [date, , alternatives] = cluster;
//       const newBestPhoto = alternatives[newBestIndex];
//       const newAlternatives = [
//         ...alternatives.slice(0, newBestIndex),
//         cluster[1],
//         ...alternatives.slice(newBestIndex + 1)
//       ];
//       newPhotos[clusterIndex] = [date, newBestPhoto, newAlternatives, true];
//       return newPhotos;
//     });
//   };

//   if (loading) return <div className="text-center mt-8">Loading...</div>;
//   if (error) return <div className="text-center mt-8 text-red-500">{error}</div>;

//   return (
//     <div className="container mx-auto p-4">
//       <h1 className="text-3xl font-bold mb-4">Photo Album</h1>
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//         {organizedPhotos.map((cluster, clusterIndex) => (
//           <div key={clusterIndex} className="border rounded-lg p-4">
//             <h2 className="text-xl font-semibold mb-2">
//               {new Date(cluster[0]).toLocaleDateString()}
//             </h2>
//             <div className="relative">
//               <img
//                 src={`http://127.0.0.1:5000${cluster[1]}`}
//                 alt="Best photo"
//                 className="w-full h-64 object-cover rounded-lg"
//               />
//             </div>
//             {cluster[2].length > 0 && (
//               <div className="mt-2">
//                 <h3 className="text-lg font-semibold mb-1">Alternatives</h3>
//                 <div className="flex flex-wrap gap-2">
//                   {cluster[2].map((alternative, index) => (
//                     <img
//                       key={index}
//                       src={`http://127.0.0.1:5000${alternative}`}
//                       alt={`Alternative ${index + 1}`}
//                       className="w-16 h-16 object-cover rounded cursor-pointer"
//                       onClick={() => changeBestPhoto(clusterIndex, index)}
//                     />
//                   ))}
//                 </div>
//               </div>
//             )}
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };

// export default PhotoAlbum;


import React from 'react';

const PhotoAlbum = ({ organizedPhotos }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {organizedPhotos.map((photo, index) => (
        <div key={index} className="border rounded-lg p-4">
          <h3 className="text-xl font-semibold mb-2">
            {photo.date || 'No Date'}
          </h3>
          <img
            src={photo.best_photo}
            alt="Best photo"
            className="w-full h-64 object-cover rounded-lg"
          />
        </div>
      ))}
    </div>
  );
};

export default PhotoAlbum;
