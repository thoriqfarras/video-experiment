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
  thumbnail_proxy_url?: string;
}

interface Participant {
  id: string;
  code: number;
  group: number;
  progress_counter: number;
}

type ExperimentState = 'loading' | 'watching' | 'completed';

export default function ExperimentPage() {
  const router = useRouter();
  const [state, setState] = useState<ExperimentState>('loading');
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [rankedVideos, setRankedVideos] = useState<Video[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [videoLoadTimedOut, setVideoLoadTimedOut] = useState(false);
  const [videoLoadTimerId, setVideoLoadTimerId] =
    useState<NodeJS.Timeout | null>(null);

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

      console.log('data', data);

      // Check if the API returned an error
      if (data.error) {
        throw new Error(data.error);
      }

      if (!response.ok) {
        throw new Error('Gagal memuat data eksperimen');
      }

      if (!data.participant || !data.videos) {
        throw new Error('Data eksperimen tidak valid diterima');
      }

      setParticipant(data.participant);
      setVideos(data.videos);

      // Ensure progress_counter is clamped to valid bounds [0, videoCount]
      const videoCount = data.videos.length;
      const rawProgress = data.participant.progress_counter ?? 0;
      const progressCounter = Math.max(0, Math.min(rawProgress, videoCount));

      // Check if participant has already completed the experiment
      if (progressCounter >= videoCount + 1) {
        setState('completed');
      } else {
        // Continue from where they left off
        setCurrentVideoIndex(progressCounter);
        // Set ranked videos to include videos that have been watched PLUS the current video
        setRankedVideos(data.videos.slice(0, progressCounter + 1));
        setState('watching');
      }
    } catch (error) {
      console.error('Error loading experiment data:', error);

      // Handle specific error types that should redirect to home
      if (error instanceof Error) {
        const errorMessage = error.message;

        // Redirect for authentication/authorization errors
        if (
          errorMessage.includes('No participant code found') ||
          errorMessage.includes('Invalid participant code') ||
          errorMessage.includes('already been used')
        ) {
          router.push('/');
          return;
        }

        // For other errors, show error state
        let displayMessage = 'Gagal memuat data eksperimen';
        if (errorMessage.includes('Failed to fetch')) {
          displayMessage =
            'Kesalahan jaringan. Mohon periksa koneksi internet Anda dan coba lagi.';
        } else if (errorMessage.includes('Failed to load experiment data')) {
          displayMessage =
            'Tidak dapat memulai eksperimen. Mohon verifikasi kode peserta Anda.';
        } else {
          displayMessage = errorMessage;
        }

        setError(displayMessage);
        setState('loading'); // Keep in loading state to show error
      } else {
        setError('Terjadi kesalahan yang tidak terduga');
        setState('loading');
      }
    }
  };

  const handleNext = async () => {
    if (!participant) return;

    // Show confirmation dialog first
    setShowConfirmDialog(true);
  };

  const handleFinish = async () => {
    if (!participant) return;

    // Show finish confirmation dialog
    setShowFinishDialog(true);
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
        throw new Error('Gagal memperbarui progress');
      }

      const nextIndex = currentVideoIndex + 1;

      if (nextIndex >= videos.length) {
        // All videos watched, submit rankings
        await submitRankings();
      } else {
        // Move to next video - the current video is already in rankings, just add the next one
        setCurrentVideoIndex(nextIndex);
        setRankedVideos([...rankedVideos, videos[nextIndex]]);
      }
    } catch (error) {
      console.error('Error updating progress:', error);
      setError('Gagal memperbarui progress. Mohon coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const confirmFinish = async () => {
    if (!participant) return;

    setIsLoading(true);
    setError(null);
    setShowFinishDialog(false);

    try {
      await submitRankings();
    } catch (error) {
      console.error('Error finishing experiment:', error);
      setError('Gagal menyelesaikan eksperimen. Mohon coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const submitRankings = async () => {
    if (!participant) return;

    try {
      const response = await fetch('/api/experiment/rankings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rankings: rankedVideos }),
      });

      if (!response.ok) {
        throw new Error('Gagal mengirim peringkat');
      }

      setState('completed');
    } catch (error) {
      console.error('Error submitting rankings:', error);
      throw error;
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

  if (state === 'loading') {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Memuat eksperimen...</p>
          <p className="text-sm text-gray-500 mt-2">
            Mohon tunggu sementara kami menyiapkan video Anda...
          </p>
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
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Gagal Memulai Eksperimen
          </h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto mb-6">
            <p className="text-red-800 text-sm">
              <strong>Eror:</strong> {error}
            </p>
          </div>
          <p className="text-gray-600 mb-6">
            Mohon periksa kode peserta Anda dan coba lagi. Jika masalah
            berlanjut, hubungi peneliti.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => window.location.reload()}
              className="bg-red-600 hover:bg-red-700"
            >
              Coba Lagi
            </Button>
            <Button onClick={() => router.push('/')} variant="outline">
              Kembali ke Awal
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // Confirmation Dialog for Next Video
  if (showConfirmDialog) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg p-8 max-w-md mx-4 shadow-xl">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Lanjut ke Video Berikutnya
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Apakah Anda yakin ingin melanjutkan ke video berikutnya? Anda
              tidak dapat kembali ke video ini setelah melanjutkan.
            </p>
            <div className="flex space-x-3">
              <Button
                onClick={() => setShowConfirmDialog(false)}
                variant="outline"
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                onClick={confirmNext}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Lanjutkan
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Confirmation Dialog for Finishing Experiment
  if (showFinishDialog) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg p-8 max-w-md mx-4 shadow-xl">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <span className="text-2xl">✅</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Selesaikan Eksperimen
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Ini adalah video terakhir. Apakah Anda yakin ingin menyelesaikan
              eksperimen dan mengirimkan peringkat Anda?
            </p>
            <div className="flex space-x-3">
              <Button
                onClick={() => setShowFinishDialog(false)}
                variant="outline"
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                onClick={confirmFinish}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                Selesaikan Eksperimen
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
          <h1 className="text-4xl font-bold text-green-600 mb-4">
            Terima Kasih!
          </h1>
          <p className="text-lg text-gray-600">
            Anda telah berhasil menyelesaikan eksperimen.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Mengalihkan ke halaman utama...
          </p>
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
          <h1 className="text-2xl font-bold text-red-600 mb-4">Kesalahan</h1>
          <p className="text-gray-600">
            Video tidak ditemukan. Mohon coba muat ulang halaman.
          </p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Muat Ulang Halaman
          </Button>
        </div>
      </main>
    );
  }

  const isLastVideo = currentVideoIndex === videos.length - 1;

  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* Participant Code */}
      <div className="text-center py-4 border-b">
        <h1 className="text-xl font-semibold">
          Kode Peserta: {participant?.code}
        </h1>
        <div className="mt-2">
          <div className="flex items-center justify-center space-x-2">
            <span className="text-sm text-gray-600">Progress:</span>
            <span className="text-sm font-medium text-blue-600">
              {currentVideoIndex + 1} dari {videos.length} video
            </span>
          </div>
          <div className="w-48 h-2 bg-gray-200 rounded-full mt-2 mx-auto">
            <div
              className="h-2 bg-blue-600 rounded-full transition-all duration-300"
              style={{
                width: `${((currentVideoIndex + 1) / videos.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Content - Video Player and Rankings Side by Side */}
      <div className="flex-1 flex p-8">
        {/* Video Player Section */}
        <div className="w-3/5 pr-6">
          <div className="text-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Video {currentVideo.order} dari {videos.length}
            </h2>
            <p className="text-gray-600">
              Jika video tidak dimuat, Anda dapat memuat ulang halaman untuk
              mencoba lagi.
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

        {/* Rankings Section */}
        <div className="w-2/5 border-l pl-6">
          <div className="sticky top-4">
            <h3 className="text-lg font-semibold mb-4">Peringkat Saat Ini</h3>
            <p className="text-sm text-gray-600 mb-4">
              Seret untuk mengatur ulang video. Peringkat 1 = calon yang paling
              Anda sukai sebagai pemimpin, Peringkat 8 = calon yang paling tidak
              Anda sukai sebagai pemimpin..
            </p>

            {rankedVideos.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Belum ada video yang diberi peringkat.</p>
                <p className="text-sm mt-2">
                  Tonton video ini untuk mulai memberi peringkat.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                {rankedVideos.map((video, index) => (
                  <div
                    key={video.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`
                      p-3 border-2 border-gray-200 rounded-lg cursor-move
                      ${
                        draggedIndex === index
                          ? 'border-blue-500 bg-blue-50'
                          : 'bg-white'
                      }
                      hover:border-gray-300 transition-colors
                    `}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-8 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500 overflow-hidden relative">
                        {video.thumbnail_proxy_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={video.thumbnail_proxy_url}
                            alt={`Thumbnail for Video ${video.order}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fallback =
                                e.currentTarget.parentElement?.querySelector(
                                  '.fallback-emoji'
                                );
                              if (fallback) {
                                fallback.classList.remove('hidden');
                              }
                            }}
                            onLoad={(e) => {
                              const fallback =
                                e.currentTarget.parentElement?.querySelector(
                                  '.fallback-emoji'
                                );
                              if (fallback) {
                                fallback.classList.add('hidden');
                              }
                            }}
                          />
                        ) : null}
                        <span
                          className={`text-xs fallback-emoji ${
                            video.thumbnail_proxy_url ? 'hidden' : ''
                          }`}
                        >
                          📹
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">
                          Video {video.order}
                        </h4>
                        <p className="text-xs text-gray-400">
                          Peringkat {index + 1}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="border-t p-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex-1">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 inline-block">
              <p className="text-sm text-yellow-800 font-medium">
                ⚠️ Pastikan Anda menonton sampai selesai. Setelah Anda menekan
                lanjut, Anda TIDAK DAPAT kembali.
              </p>
            </div>
          </div>
          {!isVideoReady && (
            <div className="mr-4 text-sm text-gray-500">
              {videoLoadTimedOut
                ? 'Video masih dimuat… Anda dapat mencoba menunggu sedikit lebih lama.'
                : 'Memuat video…'}
            </div>
          )}
          <Button
            onClick={isLastVideo ? handleFinish : handleNext}
            disabled={isLoading}
            className={`ml-4 px-8 py-2 disabled:opacity-50 ${
              isLastVideo
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoading
              ? 'Memperbarui...'
              : isLastVideo
              ? 'Selesaikan Eksperimen'
              : 'Lanjut'}
          </Button>
        </div>
      </div>
    </main>
  );
}
