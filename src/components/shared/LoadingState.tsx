// ============================================================================
// SHOREBREAK AI - COMPOSANT LOADING STATE
// ============================================================================

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

interface LoadingStateProps {
  phases?: Array<{ text: string; duration: number }>;
  type?: 'reviews' | 'seo';
}

// ----------------------------------------------------------------------------
// Phases par défaut
// ----------------------------------------------------------------------------

const defaultPhases = {
  reviews: [
    { text: 'Connecting to data sources...', duration: 800 },
    { text: 'Scraping recent reviews...', duration: 1500 },
    { text: 'Processing natural language models...', duration: 2000 },
    { text: 'Analyzing sentiment patterns...', duration: 1500 },
    { text: 'Generating strategic insights...', duration: 1500 },
  ],
  seo: [
    { text: 'Connecting to data sources...', duration: 800 },
    { text: 'Crawling site structure...', duration: 2000 },
    { text: 'Analyzing technical SEO factors...', duration: 2000 },
    { text: 'Evaluating content quality...', duration: 1500 },
    { text: 'Generating recommendations...', duration: 1500 },
  ],
};

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export function LoadingState({ phases, type = 'reviews' }: LoadingStateProps) {
  const loadingPhases = phases || defaultPhases[type];
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let accumulatedTime = 0;
    const totalTime = loadingPhases.reduce((sum, phase) => sum + phase.duration, 0);

    // Progress bar animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + (100 / (totalTime / 100));
        return Math.min(newProgress, 95); // Cap at 95% until complete
      });
    }, 100);

    // Phase transitions
    loadingPhases.forEach((phase, index) => {
      setTimeout(() => {
        setCurrentPhaseIndex(index);
      }, accumulatedTime);
      accumulatedTime += phase.duration;
    });

    return () => {
      clearInterval(progressInterval);
    };
  }, [loadingPhases]);

  const currentPhase = loadingPhases[currentPhaseIndex];

  return (
    <div className="fixed inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
      {/* Spinner with Icon */}
      <div className="relative mb-8">
        <div className="w-20 h-20 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-blue-600 animate-pulse" />
        </div>
      </div>

      {/* Phase Text */}
      <h3 className="text-xl font-semibold text-slate-900 mb-2 text-center">
        {currentPhase.text}
      </h3>

      {/* Subtitle */}
      <p className="text-slate-500 text-sm text-center mb-8">
        This usually takes 30-60 seconds. Please do not close this tab.
      </p>

      {/* Progress Bar */}
      <div className="w-64 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Phase Indicators */}
      <div className="flex items-center gap-2 mt-6">
        {loadingPhases.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index <= currentPhaseIndex ? 'bg-blue-600' : 'bg-slate-200'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default LoadingState;
