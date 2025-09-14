import React from 'react';
      
const FeatureGrid = () => {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">More Features</h2>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Feature 1 */}
          <div className="bg-gray-50 rounded-lg p-6 text-center hover:shadow-lg transition-shadow duration-300">
            <div className="w-16 h-16 bg-blue-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <div className="w-8 h-8 bg-blue-500 rounded"></div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Live Demo</h3>
            <p className="text-sm text-gray-600 mb-4">
              Try a live demo – no commitment necessary
            </p>
            <div className="text-orange-500 text-sm font-medium">
              Get Centova Cast now!
            </div>
          </div>

          {/* Feature 2 */}
          <div className="bg-gray-50 rounded-lg p-6 text-center hover:shadow-lg transition-shadow duration-300">
            <div className="w-16 h-16 bg-orange-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <div className="w-8 h-8 bg-orange-500 rounded"></div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">System Requirements</h3>
            <p className="text-sm text-gray-600 mb-4">
              Confirm that Centova Cast will work in your environment
            </p>
            <div className="text-orange-500 text-sm font-medium">
              Check requirements
            </div>
          </div>

          {/* Feature 3 */}
          <div className="bg-gray-50 rounded-lg p-6 text-center hover:shadow-lg transition-shadow duration-300">
            <div className="w-16 h-16 bg-green-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <div className="w-8 h-8 bg-green-500 rounded"></div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Support Resources</h3>
            <p className="text-sm text-gray-600 mb-4">
              Let us help you install and configure your system
            </p>
            <div className="text-orange-500 text-sm font-medium">
              Get support
            </div>
          </div>

          {/* Feature 4 */}
          <div className="bg-gray-50 rounded-lg p-6 text-center hover:shadow-lg transition-shadow duration-300">
            <div className="w-16 h-16 bg-purple-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <div className="w-8 h-8 bg-purple-500 rounded"></div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Order now!</h3>
            <p className="text-sm text-gray-600 mb-4">
              Get Centova Cast now!
            </p>
            <div className="text-orange-500 text-sm font-medium">
              Purchase license
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeatureGrid;