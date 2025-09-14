import React from 'react';
import { Monitor, BarChart3, Music } from 'lucide-react';

const Features = () => {
  const features = [
    {
      icon: Monitor,
      title: 'Intuitive Interface',
      description: 'Click to start and stop streams. Drag and drop to create playlists. Manage stations with ease.',
    },
    {
      icon: BarChart3,
      title: 'Advanced Statistics',
      description: 'Review detailed performance metrics, listener demographics, resource usage, and royalty reports.',
    },
    {
      icon: Music,
      title: 'Embeddable Widgets',
      description: 'Integrate now-playing details, recent tracks, song requests, and more into your own web site.',
    },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Powerful Stream Management
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Manage a single station with ease, or automate a stream hosting business with thousands of clients.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="text-center group cursor-pointer">
              <div className="w-20 h-20 mx-auto mb-6 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors duration-300">
                <feature.icon className="w-10 h-10 text-orange-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;