import React from 'react';
import { Button } from './ui/button';
import { Play } from 'lucide-react';

const Hero = () => {
  return (
    <section className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 text-white py-24 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-32 h-32 rounded-full border-2 border-white/20"></div>
        <div className="absolute top-40 right-20 w-48 h-48 rounded-full border border-white/10"></div>
        <div className="absolute bottom-20 left-1/3 w-24 h-24 rounded-full border-2 border-orange-400/30"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Streaming Radio for Hosting Providers
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-4xl mx-auto">
            Centova Cast provides the tools you need to automate and manage your Internet radio hosting service.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 text-lg font-semibold rounded-lg transition-all duration-300 transform hover:scale-105">
              Learn more
            </Button>
            <Button variant="outline" className="border-orange-400 text-orange-400 hover:bg-orange-400 hover:text-white px-8 py-3 text-lg font-semibold rounded-lg transition-all duration-300 transform hover:scale-105">
              Try it free
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;