import React from 'react';
import Hero from '../components/Hero';
import Features from '../components/Features';
import ControlPanelPreview from '../components/ControlPanelPreview';
import FeatureGrid from '../components/FeatureGrid';
import BottomCTA from '../components/BottomCTA';

const Homepage = () => {
  return (
    <div className="min-h-screen">
      <Hero />
      <Features />
      <ControlPanelPreview />
      <FeatureGrid />
      <BottomCTA />
    </div>
  );
};

export default Homepage;