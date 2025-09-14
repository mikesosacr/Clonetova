import React from 'react';

const BottomCTA = () => {
  return (
    <section className="py-16 bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">News</h2>
          <div className="max-w-2xl mx-auto">
            <p className="text-gray-600 mb-8">
              Stay up to date with the latest Centova Cast announcements and updates.
            </p>
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Centova Cast v3.2.12 Released
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                We're pleased to announce the release of Centova Cast v3.2.12, featuring enhanced security updates, 
                improved AutoDJ functionality, and better compatibility with modern streaming formats.
              </p>
              <div className="text-orange-500 text-sm font-medium">
                Read more →
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BottomCTA;