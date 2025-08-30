'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface Video {
  id: string;
  title: string;
  url: string;
  group: number;
  order: number;
  thumbnail_url?: string;
}

interface Participant {
  id: string;
  code: number;
  group: number;
  progress_counter: number;
}

type ExperimentState = 'loading' | 'watching' | 'ranking' | 'completed';

export default function ExperimentPage() {
  const router = useRouter();
  const [state, setState] = useState<ExperimentState>('loading');
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [rankedVideos, setRankedVideos] = useState<Video[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [videoLoadTimedOut, setVideoLoadTimedOut] = useState(false);
  const [videoLoadTimerId, setVideoLoadTimerId] = useState<NodeJS.Timeout | null>(null);



  useEffect(() => {
    loadExperimentData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset per-video readiness when video changes; start a per-video fallback timer
  useEffect(() => {
    // Only apply during watching state when a currentVideo exists
    if (state !== 'watching') {
      if (videoLoadTimerId) clearTimeout(videoLoadTimerId);
      setIsVideoReady(false);
      setVideoLoadTimedOut(false);
      return;
    }
    setIsVideoReady(false);
    setVideoLoadTimedOut(false);
    if (videoLoadTimerId) clearTimeout(videoLoadTimerId);
    const id = setTimeout(() => {
      setVideoLoadTimedOut(true);
    }, 20000); // 20s fallback per video
    setVideoLoadTimerId(id);
    return () => {
      clearTimeout(id);
    };
  }, [state, currentVideoIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Redirect after completion (top-level to preserve hook order)
  useEffect(() => {
    if (state !== 'completed') return;
    const timer = setTimeout(() => {
      router.push('/');
    }, 3000);
    return () => clearTimeout(timer);
  }, [state, router]);

  const loadExperimentData = async () => {
    try {
      const response = await fetch('/api/experiment');
      
      // Handle non-JSON responses (like redirects)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        router.push('/');
        return;
      }
      
      const data = await response.json();
      
      // Check if the API returned an error
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (!response.ok) {
        throw new Error('Failed to load experiment data');
      }
      
      if (!data.participant || !data.videos) {
        throw new Error('Invalid experiment data received');
      }
      
      setParticipant(data.participant);
      setVideos(data.videos);
      
      // Ensure progress_counter is clamped to valid bounds [0, videoCount]
      const videoCount = data.videos.length;
      const rawProgress = (data.participant.progress_counter ?? 0);
      const progressCounter = Math.max(0, Math.min(rawProgress, videoCount));
      
      // Check if participant has already completed the experiment
      if (progressCounter >= videoCount + 1) {
        setState('completed');
      } else if (progressCounter >= videoCount) {
        // All videos watched, move to ranking
        setRankedVideos([...data.videos]);
        setState('ranking');
      } else {
        // Continue from where they left off
        setCurrentVideoIndex(progressCounter);
        setState('watching');
      }
    } catch (error) {
      console.error('Error loading experiment data:', error);
      
      // Handle specific error types that should redirect to home
      if (error instanceof Error) {
        const errorMessage = error.message;
        
        // Redirect for authentication/authorization errors
        if (errorMessage.includes('No participant code found') || 
            errorMessage.includes('Invalid participant code') ||
            errorMessage.includes('already been used')) {
          router.push('/');
          return;
        }
        
        // For other errors, show error state
        let displayMessage = 'Failed to load experiment data';
        if (errorMessage.includes('Failed to fetch')) {
          displayMessage = 'Network error. Please check your internet connection and try again.';
        } else if (errorMessage.includes('Failed to load experiment data')) {
          displayMessage = 'Unable to start the experiment. Please verify your participant code.';
        } else {
          displayMessage = errorMessage;
        }
        
        setError(displayMessage);
        setState('loading'); // Keep in loading state to show error
      } else {
        setError('An unexpected error occurred');
        setState('loading');
      }
    }
  };

  const handleNext = async () => {
    if (!participant) return;

    // Show confirmation dialog first
    setShowConfirmDialog(true);
  };

  const confirmNext = async () => {
    if (!participant) return;

    setIsLoading(true);
    setError(null);
    setShowConfirmDialog(false);

    try {
      // Increment progress counter
      const response = await fetch('/api/experiment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'increment_progress' }),
      });

      if (!response.ok) {
        throw new Error('Failed to update progress');
      }

      const nextIndex = currentVideoIndex + 1;

      if (nextIndex >= videos.length) {
        // All videos watched, move to ranking
        setRankedVideos([...videos]);
        setState('ranking');
      } else {
        // Move to next video
        setCurrentVideoIndex(nextIndex);
      }
    } catch (error) {
      console.error('Error updating progress:', error);
      setError('Failed to update progress. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (isNaN(draggedIndex) || draggedIndex === dropIndex) return;

    const newRankedVideos = [...rankedVideos];
    const [draggedVideo] = newRankedVideos.splice(draggedIndex, 1);
    newRankedVideos.splice(dropIndex, 0, draggedVideo);
    
    setRankedVideos(newRankedVideos);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSubmitRankings = async () => {
    if (!participant) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/experiment/rankings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rankings: rankedVideos }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit rankings');
      }

      setState('completed');
    } catch (error) {
      console.error('Error submitting rankings:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (state === 'loading') {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading experiment...</p>
          <p className="text-sm text-gray-500 mt-2">Please wait while we prepare your videos...</p>
        </div>
      </main>
    );
  }

  // Add error state handling
  if (error && !participant) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-bold text-red-600 mb-4">Failed to Start Experiment</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto mb-6">
            <p className="text-red-800 text-sm">
              <strong>Error:</strong> {error}
            </p>
          </div>
          <p className="text-gray-600 mb-6">
            Please check your participant code and try again. If the problem persists, contact the researcher.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-700">
              Try Again
            </Button>
            <Button onClick={() => router.push('/')} variant="outline">
              Back to Start
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // Confirmation Dialog
  if (showConfirmDialog) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg p-8 max-w-md mx-4 shadow-xl">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Confirm Next Video
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to proceed to the next video? You cannot go back to this video once you continue.
            </p>
            <div className="flex space-x-3">
              <Button
                onClick={() => setShowConfirmDialog(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmNext}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (state === 'completed') {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-green-600 mb-4">Thank You!</h1>
          <p className="text-lg text-gray-600">
            You have successfully completed the experiment.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Redirecting to landing page...
          </p>
        </div>
      </main>
    );
  }

  if (state === 'ranking') {
    return (
      <main className="min-h-screen bg-white p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">Rank the Videos</h1>
            <p className="text-gray-600 mb-4">
              Please drag and drop the videos below to rank them in order of preference.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
              <p className="text-sm text-blue-800">
                <strong>Instructions:</strong> Drag each video to reorder them. The video at the top (Rank 1) should be your most preferred, 
                and the video at the bottom should be your least preferred. You can drag videos up or down to change their ranking.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {rankedVideos.map((video, index) => (
              <div
                key={video.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`
                  p-4 border-2 border-gray-200 rounded-lg cursor-move
                  ${draggedIndex === index ? 'border-blue-500 bg-blue-50' : 'bg-white'}
                  hover:border-gray-300 transition-colors
                `}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-12 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500 overflow-hidden relative">
                    {video.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={video.thumbnail_url} 
                        alt={`Thumbnail for Video ${video.order}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.parentElement?.querySelector('.fallback-emoji');
                          if (fallback) {
                            fallback.classList.remove('hidden');
                          }
                        }}
                        onLoad={(e) => {
                          const fallback = e.currentTarget.parentElement?.querySelector('.fallback-emoji');
                          if (fallback) {
                            fallback.classList.add('hidden');
                          }
                        }}
                      />
                    ) : null}
                    <span className={`text-xs fallback-emoji ${video.thumbnail_url ? 'hidden' : ''}`}>📹</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Video {video.order}</h3>
                    <p className="text-xs text-gray-400">Originally shown {video.order} of {videos.length}</p>
                  </div>
                  <div className="text-sm text-gray-400 flex items-center space-x-2">
                    <span className="text-xs text-gray-500">Rank:</span>
                    <span className="font-semibold text-lg">{index + 1}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-end">
            <Button
              onClick={handleSubmitRankings}
              disabled={isSubmitting}
              className="px-8 py-2"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Rankings'}
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // Watching state
  const currentVideo = videos[currentVideoIndex];
  if (!currentVideo) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">No video found. Please try refreshing the page.</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Refresh Page
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* Participant Code */}
      <div className="text-center py-4 border-b">
        <h1 className="text-xl font-semibold">
          Participant Code: {participant?.code}
        </h1>
        <div className="mt-2">
          <div className="flex items-center justify-center space-x-2">
            <span className="text-sm text-gray-600">Progress:</span>
            <span className="text-sm font-medium text-blue-600">
              {currentVideoIndex + 1} of {videos.length} videos
            </span>
          </div>
          <div className="w-48 h-2 bg-gray-200 rounded-full mt-2 mx-auto">
            <div 
              className="h-2 bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${((currentVideoIndex + 1) / videos.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Video Player */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Video {currentVideo.order} of {videos.length}
            </h2>
            <p className="text-gray-600">
              If the video does not load, you may refresh the page to retry.
            </p>
          </div>
          
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          
          <iframe
            src={currentVideo.url}
            width="100%"
            height="480"
            allow="autoplay"
            className="rounded-lg shadow-lg"
            onLoad={() => {
              setIsVideoReady(true);
              if (videoLoadTimerId) {
                clearTimeout(videoLoadTimerId);
                setVideoLoadTimerId(null);
              }
            }}
          />
        </div>
      </div>

      {/* Bottom Section */}
      <div className="border-t p-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex-1">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 inline-block">
              <p className="text-sm text-yellow-800 font-medium">
                ⚠️ Make sure you watch until the end. Once you press next, you CANNOT go back.
              </p>
            </div>
          </div>
          {!isVideoReady && (
            <div className="mr-4 text-sm text-gray-500">
              {videoLoadTimedOut ? 'Still loading the video… you can try waiting a bit longer.' : 'Loading video…'}
            </div>
          )}
          <Button
            onClick={handleNext}
            disabled={isLoading}
            className="ml-4 px-8 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Updating...' : 'Next'}
          </Button>
        </div>
      </div>
    </main>
  );
}
