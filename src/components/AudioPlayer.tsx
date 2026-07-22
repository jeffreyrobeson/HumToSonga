import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Volume2, Music, Sparkles, RefreshCw, ChevronRight } from "lucide-react";
import { Song } from "../types";

interface AudioPlayerProps {
  song: Song | null;
  isLoading?: boolean;
}

interface LyricLine {
  time: number;
  text: string;
}

export default function AudioPlayer({ song, isLoading = false }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [activeLyricIndex, setActiveLyricIndex] = useState(-1);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);

  // Parse LRC lyrics
  const parseLyrics = (lrcStr: string): LyricLine[] => {
    if (!lrcStr) return [];
    const lines = lrcStr.split("\n");
    const result: LyricLine[] = [];
    const timeReg = /\[(\d{2}):(\d{2})[.:](\d{2,3})\]/;

    for (const line of lines) {
      const match = timeReg.exec(line);
      if (match) {
        const min = parseInt(match[1], 10);
        const sec = parseInt(match[2], 10);
        const time = min * 60 + sec;
        const text = line.replace(/\[\d{2}:\d{2}[.:]\d{2,3}\]/g, "").trim();
        if (text) {
          result.push({ time, text });
        }
      }
    }
    return result.sort((a, b) => a.time - b.time);
  };

  // Set up lyrics when song details are loaded
  useEffect(() => {
    if (song?.lyric) {
      setLyrics(parseLyrics(song.lyric));
    } else {
      setLyrics([]);
    }
    setActiveLyricIndex(-1);
    setIsPlaying(false);
  }, [song]);

  // Sync active lyric with currentTime
  useEffect(() => {
    if (lyrics.length === 0) return;

    let targetIdx = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (currentTime >= lyrics[i].time) {
        targetIdx = i;
      } else {
        break;
      }
    }

    if (targetIdx !== activeLyricIndex) {
      setActiveLyricIndex(targetIdx);
      
      // Smoothly scroll active lyric to center of lyrics container
      if (lyricsContainerRef.current && targetIdx !== -1) {
        const container = lyricsContainerRef.current;
        const activeItem = container.children[targetIdx] as HTMLElement;
        if (activeItem) {
          const containerHeight = container.clientHeight;
          const itemOffsetTop = activeItem.offsetTop;
          const itemHeight = activeItem.clientHeight;
          
          container.scrollTo({
            top: itemOffsetTop - containerHeight / 2 + itemHeight / 2,
            behavior: "smooth"
          });
        }
      }
    }
  }, [currentTime, lyrics, activeLyricIndex]);

  // Handle Play/Pause
  const togglePlay = () => {
    if (!audioRef.current || !song?.url) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(e => console.warn("Audio play failed:", e));
      setIsPlaying(true);
    }
  };

  // Reset audio states when song changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load();
      if (song?.url) {
        // Auto play on song loaded
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setIsPlaying(true))
            .catch(() => setIsPlaying(false));
        }
      }
    }
  }, [song?.url]);

  // Handle Progress Bar dragging
  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const newTime = parseFloat(e.target.value);
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Handle Volume dragging
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
  };

  // Format time (e.g. 143 -> 02:23)
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "00:00";
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="bg-neutral-900 text-white rounded-2xl p-6 border border-neutral-800 flex flex-col items-center justify-center min-h-[300px] shadow-lg">
        <Sparkles className="w-10 h-10 text-neutral-400 animate-pulse mb-3" />
        <p className="text-sm font-semibold text-neutral-300">正在为你定制匹配最完美的声景音乐...</p>
        <p className="text-xs text-neutral-500 mt-1">AI 正在深度解析你的情绪与照片</p>
      </div>
    );
  }

  if (!song) {
    return (
      <div className="bg-neutral-900 text-white rounded-2xl p-6 border border-neutral-800 flex flex-col items-center justify-center min-h-[300px] text-center shadow-lg">
        <div className="w-12 h-12 rounded-full bg-neutral-800/80 flex items-center justify-center mb-3 text-neutral-500">
          <Music className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-neutral-400">尚未触发任何音乐声景</p>
        <p className="text-xs text-neutral-600 max-w-xs mt-1.5">
          在上方拍照/上传，点击代表你当前心境的情感图标，让 AI 找到属于这一刻的歌。
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-neutral-900 to-neutral-950 text-white rounded-2xl p-6 border border-neutral-800/60 shadow-xl relative overflow-hidden">
      {/* Decorative backdrop glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-neutral-800/10 rounded-full blur-3xl pointer-events-none" />

      {/* Hidden audio element */}
      {song.url && (
        <audio
          ref={audioRef}
          src={song.url}
          onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
          onDurationChange={() => setDuration(audioRef.current?.duration || 0)}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Left column: Disc & Cover */}
        <div className="md:col-span-5 flex flex-col items-center text-center">
          <div className="relative group mb-4">
            {/* Spinning Disc Frame */}
            <div className="w-40 h-40 rounded-full bg-neutral-800 p-1 shadow-2xl flex items-center justify-center border-4 border-neutral-800 relative z-10 overflow-hidden">
              <div 
                className={`w-full h-full rounded-full overflow-hidden relative transition-transform duration-[8000ms] linear ${isPlaying ? 'rotate-infinite' : ''}`}
                style={{
                  animation: isPlaying ? 'spin 12s linear infinite' : 'none'
                }}
              >
                {song.cover ? (
                  <img
                    src={song.cover}
                    alt={song.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
                    <Music className="w-12 h-12 text-neutral-700" />
                  </div>
                )}
                {/* Center hole of vinyl */}
                <div className="absolute inset-0 m-auto w-10 h-10 bg-neutral-950 rounded-full border border-neutral-800 flex items-center justify-center">
                  <div className="w-3.5 h-3.5 bg-neutral-800 rounded-full" />
                </div>
              </div>
            </div>

            {/* Glowing active animation */}
            {isPlaying && (
              <span className="absolute -inset-1 rounded-full bg-white/5 animate-ping pointer-events-none" />
            )}
          </div>

          <h4 className="text-base font-bold text-neutral-100 truncate w-full max-w-xs mb-1">
            {song.name}
          </h4>
          <p className="text-xs text-neutral-400 truncate w-full max-w-xs mb-3">
            {song.artists}
          </p>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-neutral-800/80 rounded-full text-[10px] font-bold tracking-wider text-neutral-300 uppercase">
            源自: {song.source === 'qq' ? 'QQ 音乐' : '网易云音乐'}
          </span>
        </div>

        {/* Right column: Lyrics Panel */}
        <div className="md:col-span-7 flex flex-col h-48 justify-center relative">
          <div className="absolute top-0 bottom-0 left-0 right-0 bg-gradient-to-t from-neutral-950 via-transparent to-neutral-900 pointer-events-none z-10" />
          
          <div
            ref={lyricsContainerRef}
            className="h-full overflow-y-auto no-scrollbar py-16 px-4 space-y-4 text-center z-0 relative"
            style={{ scrollbarWidth: "none" }}
          >
            {lyrics.length > 0 ? (
              lyrics.map((line, idx) => (
                <div
                  key={idx}
                  className={`text-xs font-semibold transition-all duration-300 origin-center ${
                    idx === activeLyricIndex
                      ? "text-white text-sm scale-105 font-bold"
                      : "text-neutral-500 opacity-60"
                  }`}
                >
                  {line.text}
                </div>
              ))
            ) : (
              <div className="text-xs text-neutral-600 h-full flex items-center justify-center italic">
                {song.url ? "正在加载或未找到滚动歌词..." : "暂无歌曲源或无法播放"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controller Controls */}
      <div className="mt-6 pt-5 border-t border-neutral-800/60">
        {/* Progress bar */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[10px] font-mono text-neutral-400 min-w-[32px]">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={currentTime}
            onChange={handleProgressChange}
            className="flex-1 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-white"
          />
          <span className="text-[10px] font-mono text-neutral-400 min-w-[32px]">
            {formatTime(duration)}
          </span>
        </div>

        {/* Master Control Panel */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Play Button */}
            <button
              type="button"
              onClick={togglePlay}
              disabled={!song.url}
              className={`w-11 h-11 rounded-full bg-white text-black flex items-center justify-center transition shadow-md hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>
          </div>

          {/* Volume input */}
          <div className="flex items-center gap-2 bg-neutral-900 px-3 py-1.5 rounded-full border border-neutral-800/40">
            <Volume2 className="w-3.5 h-3.5 text-neutral-400" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={handleVolumeChange}
              className="w-16 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-neutral-400"
            />
          </div>
        </div>
      </div>
      
      {/* Custom Keyframes for Disc Rotation */}
      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
