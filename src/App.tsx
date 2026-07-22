import React, { useState } from "react";
import { Sparkles, Music, Image as ImageIcon, Smile, Settings, HelpCircle, Lock, ShieldCheck } from "lucide-react";
import CameraCapture from "./components/CameraCapture";
import AudioPlayer from "./components/AudioPlayer";
import ModelSettings from "./components/ModelSettings";
import AdminPanel from "./components/AdminPanel";
import { AIConfig, Song, AnalysisResult } from "./types";

interface Emotion {
  id: string;
  nameZh: string;
  nameEn: string;
  emoji: string;
  color: string; // Tailwind border and bg colors
}

const EMOTIONS: Emotion[] = [
  { id: "happy", nameZh: "喜悦 (Happy)", nameEn: "Happy", emoji: "😊", color: "hover:bg-amber-50 hover:border-amber-400 bg-amber-50/20 text-amber-700 border-amber-200" },
  { id: "peaceful", nameZh: "宁静 (Peaceful)", nameEn: "Peaceful", emoji: "😌", color: "hover:bg-emerald-50 hover:border-emerald-400 bg-emerald-50/20 text-emerald-700 border-emerald-200" },
  { id: "sad", nameZh: "忧郁 (Melancholy)", nameEn: "Melancholy", emoji: "🌧️", color: "hover:bg-blue-50 hover:border-blue-400 bg-blue-50/20 text-blue-700 border-blue-200" },
  { id: "energetic", nameZh: "激情 (Energetic)", nameEn: "Energetic", emoji: "🔥", color: "hover:bg-rose-50 hover:border-rose-400 bg-rose-50/20 text-rose-700 border-rose-200" },
  { id: "romantic", nameZh: "浪漫 (Romantic)", nameEn: "Romantic", emoji: "💖", color: "hover:bg-pink-50 hover:border-pink-400 bg-pink-50/20 text-pink-700 border-pink-200" },
  { id: "nostalgic", nameZh: "怀旧 (Nostalgic)", nameEn: "Nostalgic", emoji: "🍂", color: "hover:bg-orange-50 hover:border-orange-400 bg-orange-50/20 text-orange-700 border-orange-200" }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<"matcher" | "admin">("matcher");
  
  // App matching states
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedEmotion, setSelectedEmotion] = useState<Emotion | null>(null);
  const [aiConfig, setAiConfig] = useState<AIConfig & { apiKey?: string }>({
    provider: "gemini",
    baseUrl: "",
    model: "gemini-3.6-flash",
    apiKey: ""
  });

  // Flow control
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [vibeResult, setVibeResult] = useState<AnalysisResult | null>(null);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);

  // Triggered when matchmaking starts
  const startMusicMatch = async () => {
    if (!capturedImage) {
      setAnalysisError("请先开启摄像头拍照、上传照片，或选择一张风景预设图");
      return;
    }
    if (!selectedEmotion) {
      setAnalysisError("请先选择一种契合你当前心境的情感色彩");
      return;
    }

    setAnalysisError("");
    setIsAnalyzing(true);
    setVibeResult(null);
    setCurrentSong(null);

    try {
      // 1. Send image & emotion to Server for analysis
      const res = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: capturedImage,
          emotion: selectedEmotion.nameEn,
          customConfig: aiConfig
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "大模型分析失败，请确认你的服务运行状态与 API 密钥。");
      }

      const result: AnalysisResult = await res.json();
      setVibeResult(result);

      // 2. Automatically search music on generated searchQuery query string
      const searchRes = await fetch(`/api/music/search?q=${encodeURIComponent(result.searchQuery)}`);
      if (!searchRes.ok) {
        throw new Error("声景音乐搜索接口失败。");
      }

      const searchData = await searchRes.json();
      const songsList: Song[] = searchData.songs || [];

      if (songsList.length === 0) {
        throw new Error(`虽然 AI 成功解析了画境，但是在音乐曲库中未搜索到匹配项: "${result.searchQuery}"`);
      }

      // 3. Resolve detail for the first song matched (or fallback and try next if resolving fails)
      let resolvedSong: Song | null = null;
      for (const song of songsList.slice(0, 3)) {
        try {
          const detailRes = await fetch(`/api/music/detail?id=${song.id}&source=${song.source}`);
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            if (detailData && detailData.url) {
              resolvedSong = {
                ...song,
                url: detailData.url,
                lyric: detailData.lyric || ""
              };
              break;
            }
          }
        } catch (detailErr) {
          console.warn(`Attempt failed to resolve song ${song.name}`, detailErr);
        }
      }

      if (resolvedSong) {
        setCurrentSong(resolvedSong);
      } else {
        // Fallback: If no playable URL, play a gentle copyright-free healing background audio
        setCurrentSong({
          id: "fallback-healing",
          name: `${result.title} (AI 推荐曲目)`,
          artists: "AI 音乐匹配器",
          cover: songsList[0]?.cover || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=300&q=80",
          url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", // high quality demo audio stream
          lyric: "[00:01.00]AI 为你配置了最合适的环境舒缓音乐\n[00:10.00]伴着纯音乐感受落日与海浪的低语\n[00:20.00]静静享受这一刻的艺术融合...\n[01:00.00]海风徐徐，思绪流淌",
          source: 'fallback'
        });
      }

    } catch (err: any) {
      setAnalysisError(err.message || "匹配过程中发生了意料外的错误，请重试。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-800 font-sans">
      {/* Universal Navigation Header */}
      <header className="border-b border-neutral-200/60 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-neutral-900 flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5 text-amber-300 fill-current" />
            </div>
            <div>
              <h1 className="text-base font-bold text-neutral-900 leading-tight">AI 音乐声景匹配器</h1>
              <p className="text-[10px] text-neutral-400 font-medium">拍张照片，点击情感，让音乐找到你</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("matcher")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === "matcher"
                  ? "bg-neutral-950 text-white shadow-sm"
                  : "text-neutral-500 hover:text-neutral-800 bg-neutral-100/50"
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              声景空间 App
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("admin")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === "admin"
                  ? "bg-neutral-950 text-white shadow-sm"
                  : "text-neutral-500 hover:text-neutral-800 bg-neutral-100/50"
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              后台管理系统
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Stage */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === "admin" ? (
          <div className="max-w-4xl mx-auto">
            <AdminPanel />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Visual Capture, Emotion, Config (8 cols) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* AI Parameters Drawer Panel */}
              <ModelSettings onConfigChange={(cfg) => setAiConfig(cfg)} />

              {/* Step 1: Camera & Visual component */}
              <CameraCapture onImageCaptured={(img) => setCapturedImage(img)} />

              {/* Step 2: Emotion selection */}
              <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-neutral-800 mb-2 flex items-center gap-2">
                  <Smile className="w-5 h-5 text-neutral-600" /> 第二步：点选你当前的内在心境
                </h3>
                <p className="text-xs text-neutral-400 mb-4">
                  请选择最贴切当下这一瞬间的情感，AI 会将其与画面的美学元素、明暗度等结合匹配。
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {EMOTIONS.map((emo) => {
                    const isSelected = selectedEmotion?.id === emo.id;
                    return (
                      <button
                        key={emo.id}
                        type="button"
                        onClick={() => setSelectedEmotion(emo)}
                        className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${emo.color} ${
                          isSelected
                            ? "ring-2 ring-neutral-900 border-transparent bg-neutral-900/5 scale-[1.02]"
                            : ""
                        }`}
                      >
                        <span className="text-2xl mb-1">{emo.emoji}</span>
                        <span className="text-xs font-bold text-neutral-800">{emo.nameZh}</span>
                        
                        {isSelected && (
                          <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-neutral-900" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Start matchmaking button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={startMusicMatch}
                  disabled={isAnalyzing || !capturedImage || !selectedEmotion}
                  className="w-full py-3.5 rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 transition shadow-md flex items-center justify-center gap-2 font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? (
                    <>
                      <Sparkles className="w-4.5 h-4.5 animate-spin text-amber-300" />
                      <span>AI 声景深度分析与曲库匹配中...</span>
                    </>
                  ) : (
                    <>
                      <Music className="w-4.5 h-4.5 text-amber-300 fill-current" />
                      <span>开启画境共鸣 · 寻找心动之声</span>
                    </>
                  )}
                </button>

                {analysisError && (
                  <p className="text-xs text-rose-600 font-semibold mt-3 text-center bg-rose-50 border border-rose-100 rounded-lg p-2.5">
                    {analysisError}
                  </p>
                )}
              </div>
            </div>

            {/* Right Column: AI Vibe results & AudioPlayer (5 cols) */}
            <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
              
              {/* AI Vibe Showcase card */}
              {vibeResult && (
                <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-sm space-y-4 animate-fadeIn">
                  <div className="flex items-center gap-2 text-neutral-800 border-b border-neutral-100 pb-2.5">
                    <Sparkles className="w-4.5 h-4.5 text-amber-500 fill-current" />
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">AI 视觉与情绪分析报告</span>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-neutral-900 flex items-center gap-1.5">
                      {vibeResult.title}
                    </h3>
                    <p className="text-xs text-neutral-400 mt-1 flex items-center gap-1">
                      <span>匹配心境:</span>
                      <span className="font-bold text-neutral-700">{vibeResult.emotionZh} ({vibeResult.emotion})</span>
                    </p>
                  </div>

                  {/* Word Cloud Vibe Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {vibeResult.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded text-[11px] font-semibold border border-neutral-200/30"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {/* Poetic description */}
                  <div className="bg-neutral-50 rounded-xl p-3.5 border border-neutral-100/50">
                    <p className="text-xs text-neutral-600 leading-relaxed italic">
                      “ {vibeResult.description} ”
                    </p>
                  </div>

                  {/* Generated Search query block */}
                  <div className="flex items-center justify-between text-[10px] text-neutral-400">
                    <span>生成检索关键词:</span>
                    <span className="font-mono font-bold text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">
                      {vibeResult.searchQuery}
                    </span>
                  </div>
                </div>
              )}

              {/* Rotating disk custom audio player */}
              <AudioPlayer song={currentSong} isLoading={isAnalyzing} />

              {/* Usage Hints Help card */}
              <div className="bg-neutral-900 text-neutral-400 rounded-2xl p-5 border border-neutral-800 shadow-sm space-y-2">
                <h4 className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-neutral-400" />
                  使用指南
                </h4>
                <ol className="text-[11px] list-decimal pl-4 space-y-1.5 leading-relaxed text-neutral-400">
                  <li>在左侧**上传照片**、**开启摄像头**或直接点击**预设精美风景**作为你的画境基础。</li>
                  <li>从列表点选一种代表你此时此刻心底情感色彩的图标。</li>
                  <li>点击最下方**“开启画境共鸣”**按钮，由 AI 模型即刻解码，并从 QQ 音乐/网易云检索与你最相配的那一首歌。</li>
                  <li>可以在上方展开**参数配置面板**切换其它自定义 AI 大模型（如 DeepSeek 等）。</li>
                </ol>
              </div>

            </div>
          </div>
        )}
      </main>
    </div>
  );
}
