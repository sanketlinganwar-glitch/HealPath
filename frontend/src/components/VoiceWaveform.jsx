import React, { useEffect, useState } from 'react';

/**
 * HACKBYTE - Voice Waveform Visualizer
 * Renders dynamic SVG/CSS audio waveform animation reflecting:
 * - 'listening': energetic cyan/blue audio input bars
 * - 'speaking': rhythmic emerald/teal TTS output waves
 * - 'processing': pulsing amber loading waves
 * - 'idle': subtle calm resting indicators
 */
export function VoiceWaveform({ state = 'idle', barCount = 16, className = '' }) {
  const [heights, setHeights] = useState(() => Array(barCount).fill(12));

  useEffect(() => {
    if (state === 'idle') {
      setHeights(Array(barCount).fill(10));
      return;
    }

    const interval = setInterval(() => {
      setHeights(
        Array.from({ length: barCount }, (_, i) => {
          if (state === 'listening') {
            // Random dynamic audio wave variation
            const base = Math.sin((i / barCount) * Math.PI) * 36;
            return Math.max(8, Math.floor(base + Math.random() * 24));
          }
          if (state === 'speaking') {
            // Harmonic rhythmic wave for speech synthesis
            const time = Date.now() / 150;
            const wave = (Math.sin(time + i * 0.6) + 1) * 18;
            return Math.max(6, Math.floor(wave + 10));
          }
          if (state === 'processing') {
            // Rolling wave
            const wave = (Math.sin(Date.now() / 200 + i * 0.4) + 1) * 12;
            return Math.max(6, Math.floor(wave + 8));
          }
          return 10;
        })
      );
    }, 80);

    return () => clearInterval(interval);
  }, [state, barCount]);

  const getColorClass = (i) => {
    if (state === 'listening') {
      return i % 2 === 0 ? 'bg-cyan-500' : 'bg-blue-600';
    }
    if (state === 'speaking') {
      return i % 2 === 0 ? 'bg-emerald-500' : 'bg-teal-600';
    }
    if (state === 'processing') {
      return 'bg-amber-500';
    }
    return 'bg-slate-300';
  };

  return (
    <div className={`flex items-center justify-center space-x-1.5 h-16 px-4 ${className}`} aria-hidden="true">
      {heights.map((h, i) => (
        <span
          key={i}
          className={`w-1 sm:w-1.5 rounded-full transition-all duration-100 ${getColorClass(i)}`}
          style={{ height: `${h}px` }}
        />
      ))}
    </div>
  );
}

export default VoiceWaveform;
