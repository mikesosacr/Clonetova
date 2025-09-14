import React from 'react';
import { Button } from './ui/button';
import { ExternalLink, Play, Settings, Users } from 'lucide-react';

const ControlPanelPreview = () => {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left side - Content */}
          <div>
            <h2 className="text-4xl font-bold text-orange-500 mb-6">Centova Cast</h2>
            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
              Manage a single station with ease, or automate a stream hosting business with thousands of clients. 
              Centova Cast can handle virtually any stream hosting scenario!
            </p>
            
            <div className="flex flex-wrap gap-4 mb-12">
              <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                Take a tour
              </Button>
              <Button variant="outline" className="border-orange-400 text-orange-600 hover:bg-orange-50">
                Try it free
              </Button>
              <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50">
                Order now
              </Button>
            </div>

            {/* Feature list */}
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Centralized Administration</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Manage accounts with ease from a centralized control panel, providing overviews of client information, 
                  resource limits & usage, and more.
                </p>
                <button className="text-orange-500 text-sm font-medium hover:text-orange-600 transition-colors">
                  Try an admin demo →
                </button>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Comprehensive Statistics</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Keep track of your performances, listeners, and resource usage via our comprehensive stream statistics system.
                </p>
                <button className="text-orange-500 text-sm font-medium hover:text-orange-600 transition-colors">
                  Try a stats demo →
                </button>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">AutoDJ + Media Library</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Drag and drop artists, albums, and tracks to create your program schedule using our industry-leading, 
                  rich media library interface.
                </p>
                <button className="text-orange-500 text-sm font-medium hover:text-orange-600 transition-colors">
                  Try an autoD demo →
                </button>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Royalty Reports</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Downloadable song performance reports make royalty reporting for music licensing purposes a breeze.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Reliability Monitoring</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Ensure broadcast reliability with automatic stream monitoring and recovery from failures.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Station Home Pages</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Centova Cast provides a unique start page for each stream, offering now-playing information, 
                  recent tracks, live listener mapping, and more.
                </p>
                <button className="text-orange-500 text-sm font-medium hover:text-orange-600 transition-colors">
                  Try a start page demo →
                </button>
              </div>
            </div>
          </div>

          {/* Right side - Control Panel Screenshot */}
          <div className="lg:sticky lg:top-8">
            <div className="bg-white rounded-lg shadow-2xl p-2">
              <div className="bg-slate-700 rounded-t-md p-2 flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div className="flex-1 bg-slate-600 rounded px-2 py-1 ml-4">
                  <span className="text-white text-xs">Centova Cast - Control Panel</span>
                </div>
              </div>
              
              {/* Mock Control Panel Interface */}
              <div className="bg-gradient-to-b from-blue-50 to-blue-100 p-4">
                <div className="grid grid-cols-12 gap-4 h-96">
                  {/* Left Sidebar */}
                  <div className="col-span-3 bg-white rounded shadow-sm p-3">
                    <div className="text-xs font-semibold text-gray-700 mb-3">Navigation</div>
                    <div className="space-y-2">
                      {['Quick Links', 'Server Status', 'Statistics', 'AutoDJ', 'Media', 'Scheduled', 'General', 'Mount Points', 'Live'].map((item, idx) => (
                        <div key={idx} className={`text-xs py-1 px-2 rounded ${idx === 2 ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'} cursor-pointer transition-colors`}>
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Main Content */}
                  <div className="col-span-6 bg-white rounded shadow-sm p-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-semibold text-gray-800">Stream Statistics</div>
                      <div className="flex items-center space-x-2">
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 px-2">
                          Refresh
                        </Button>
                      </div>
                    </div>
                    
                    {/* Mock data table */}
                    <div className="space-y-2">
                      <div className="grid grid-cols-4 text-xs font-medium text-gray-600 border-b pb-1">
                        <div>Time</div>
                        <div>Listeners</div>
                        <div>Song</div>
                        <div>Duration</div>
                      </div>
                      {[
                        ['14:32:15', '24', 'The Phantom Beat', '3:45'],
                        ['14:28:30', '22', 'Night Echoes', '4:12'],
                        ['14:24:18', '19', 'Urban Lights', '3:58'],
                        ['14:20:20', '17', 'Digital Dreams', '4:23'],
                        ['14:16:02', '21', 'Neon Pulse', '3:34']
                      ].map((row, idx) => (
                        <div key={idx} className="grid grid-cols-4 text-xs text-gray-700 py-1 hover:bg-gray-50 rounded transition-colors">
                          <div className="text-blue-600">{row[0]}</div>
                          <div className="font-medium">{row[1]}</div>
                          <div className="truncate">{row[2]}</div>
                          <div>{row[3]}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Right Panel */}
                  <div className="col-span-3 bg-white rounded shadow-sm p-3">
                    <div className="text-xs font-semibold text-gray-700 mb-3">Current Status</div>
                    <div className="space-y-3">
                      <div className="bg-green-50 border border-green-200 rounded p-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <div className="text-xs text-green-700 font-medium">Stream Online</div>
                        </div>
                      </div>
                      
                      <div className="text-xs space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Listeners:</span>
                          <span className="font-medium">24/100</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Bitrate:</span>
                          <span className="font-medium">128 kbps</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Format:</span>
                          <span className="font-medium">MP3</span>
                        </div>
                      </div>

                      <div className="bg-blue-600 text-white p-2 rounded text-center">
                        <div className="text-xs font-medium">Now Playing</div>
                        <div className="text-xs mt-1 opacity-90">The Phantom Beat</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ControlPanelPreview;