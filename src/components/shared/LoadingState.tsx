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
// Phases par défaut - Adaptées pour analyses de 5-10 minutes
// ----------------------------------------------------------------------------

const defaultPhases = {
  reviews: [
    { text: 'Connecting to Google Maps...', duration: 10000 },
    { text: 'Extracting patient reviews...', duration: 30000 },
    { text: 'Processing review content...', duration: 45000 },
    { text: 'Running AI sentiment analysis...', duration: 60000 },
    { text: 'Identifying patterns and trends...', duration: 60000 },
    { text: 'Generating strategic insights...', duration: 90000 },
    { text: 'Writing personalized report...', duration: 120000 },
    { text: 'Finalizing analysis...', duration: 180000 },
  ],
  seo: [
    { text: 'Connecting to website...', duration: 10000 },
    { text: 'Crawling site architecture...', duration: 30000 },
    { text: 'Analyzing page content...', duration: 60000 },
    { text: 'Running technical SEO audit...', duration: 90000 },
    { text: 'Evaluating content quality...', duration: 90000 },
    { text: 'Generating recommendations...', duration: 120000 },
    { text: 'Writing comprehensive report...', duration: 120000 },
    { text: 'Finalizing audit...', duration: 180000 },
  ],
};

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------

export function LoadingState({ phases, type = 'reviews' }: LoadingStateProps) {
  const loadingPhases = phases || defaultPhases[type];
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    let accumulatedTime = 0;

    // Progress bar animation - très lente pour analyses longues (5-10 min)
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        // Progression très ralentie
        let increment = 0.15; // Base: ~10 min pour atteindre 90%
        if (prev > 50) increment = 0.1;
        if (prev > 70) increment = 0.05;
        if (prev > 85) increment = 0.02;
        const newProgress = prev + increment;
        return Math.min(newProgress, 92); // Cap at 92% until complete
      });
    }, 1000);

    // Elapsed time counter
    const timeInterval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    // Phase transitions
    loadingPhases.forEach((phase, index) => {
      setTimeout(() => {
        setCurrentPhaseIndex(index);
      }, accumulatedTime);
      accumulatedTime += phase.duration;
    });

    return () => {
      clearInterval(progressInterval);
      clearInterval(timeInterval);
    };
  }, [loadingPhases]);

  const currentPhase = loadingPhases[currentPhaseIndex];

  // Format elapsed time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs.toString().padStart(2, '0')}s`;
    }
    return `${secs}s`;
  };

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
      <p className="text-slate-500 text-sm text-center mb-2">
        Deep analysis typically takes 5 to 10 minutes.
      </p>
      <p className="text-slate-400 text-xs text-center mb-8">
        Please don't close this tab • Elapsed: {formatTime(elapsedTime)}
      </p>

      {/* Progress Bar */}
      <div className="w-72 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Progress percentage */}
      <p className="text-slate-400 text-xs mt-2">
        {Math.round(progress)}%
      </p>

      {/* Phase Indicators */}
      <div className="flex items-center gap-1.5 mt-6">
        {loadingPhases.slice(0, 8).map((_, index) => (
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
