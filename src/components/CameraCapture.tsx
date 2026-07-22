import React, { useRef, useState, useEffect } from "react";
import { Camera, Upload, Image as ImageIcon, RefreshCw } from "lucide-react";

interface CameraCaptureProps {
  onImageCaptured: (base64Image: string) => void;
}

// 4 high-quality scenic preset images (using small lightweight base64s or royalty free placeholder images that represent typical moods)
// We use beautiful Unsplash keywords or lightweight reliable data urls.
const PRESET_IMAGES = [
  {
    name: "落日海滩 (Warm Beach)",
    url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80",
    desc: "浪漫与温暖 (Romantic & Warm)"
  },
  {
    name: "雨夜街道 (Rainy City)",
    url: "https://images.unsplash.com/photo-1428908728789-d2de25dbd4e2?auto=format&fit=crop&w=600&q=80",
    desc: "忧郁与深思 (Melancholy & Thoughtful)"
  },
  {
    name: "晨雾森林 (Misty Forest)",
    url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=600&q=80",
    desc: "宁静与放松 (Calm & Peaceful)"
  },
  {
    name: "霓虹街区 (Neon Cyberpunk)",
    url: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80",
    desc: "活力与动感 (Energetic & Dynamic)"
  }
];

export default function CameraCapture({ onImageCaptured }: CameraCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stop camera stream when component unmounts
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    setPreviewUrl(null);
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false
      });
      setStream(mediaStream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera access failed:", err);
      alert("无法访问摄像头，请尝试上传照片或选择预设风景图");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && stream) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg");
        setPreviewUrl(dataUrl);
        onImageCaptured(dataUrl);
        
        // Stop stream
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
        setIsCameraActive(false);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setPreviewUrl(dataUrl);
        onImageCaptured(dataUrl);
        setIsCameraActive(false);
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          setStream(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Convert preset image URL to base64 via canvas to feed into Gemini API securely
  const selectPreset = async (url: string) => {
    setPreviewUrl(url); // instantly show image preview
    try {
      const response = await fetch(url, { referrerPolicy: "no-referrer" });
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        onImageCaptured(dataUrl);
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      // Fallback: send the raw unsplash URL if proxy failed, or load a preset base64 placeholder
      console.warn("Failed to fetch image for base64 conversion, using URL directly", e);
      onImageCaptured(url);
    }
    
    // Stop camera if running
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsCameraActive(false);
    }
  };

  const resetCapture = () => {
    setPreviewUrl(null);
    setIsCameraActive(false);
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center gap-2">
        <Camera className="w-5 h-5 text-neutral-600" /> 第一步：捕捉或选择你的视觉画面
      </h3>

      {/* Main Stage */}
      <div className="relative aspect-video rounded-xl bg-neutral-100 overflow-hidden border border-neutral-200/50 flex flex-col items-center justify-center mb-5">
        {isCameraActive ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
              <button
                type="button"
                onClick={capturePhoto}
                className="px-5 py-2.5 bg-neutral-900 text-white font-medium rounded-full hover:bg-neutral-800 transition shadow-md flex items-center gap-2 text-sm"
              >
                <Camera className="w-4 h-4" /> 拍照
              </button>
              <button
                type="button"
                onClick={resetCapture}
                className="px-4 py-2.5 bg-white text-neutral-700 hover:bg-neutral-50 border border-neutral-200/80 font-medium rounded-full transition shadow-sm text-sm"
              >
                取消
              </button>
            </div>
          </>
        ) : previewUrl ? (
          <>
            <img
              src={previewUrl}
              alt="Preview"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={resetCapture}
              className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition"
              title="重新捕获"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="text-center p-6 max-w-sm">
            <ImageIcon className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-neutral-600 mb-2">
              尚未选择任何画面
            </p>
            <p className="text-xs text-neutral-400 mb-5">
              你可以使用摄像头拍照、从本地上传照片，或者直接在下方点击选择一张高画质风景图。
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={startCamera}
                className="px-4 py-2 bg-neutral-950 text-white rounded-full text-xs font-semibold hover:bg-neutral-800 transition flex items-center gap-1.5 shadow-sm"
              >
                <Camera className="w-3.5 h-3.5" /> 开启摄像头
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50 rounded-full text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
              >
                <Upload className="w-3.5 h-3.5" /> 上传本地照片
              </button>
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Scenic Presets */}
      <div>
        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-2.5">
          快速预设风景（适合无摄像头测试）
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {PRESET_IMAGES.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => selectPreset(img.url)}
              className="group text-left rounded-lg overflow-hidden border border-neutral-200 hover:border-neutral-800/80 transition-all bg-neutral-50 focus:outline-none"
            >
              <div className="aspect-[4/3] w-full overflow-hidden relative">
                <img
                  src={img.url}
                  alt={img.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-2">
                <p className="text-[11px] font-bold text-neutral-700 truncate">
                  {img.name}
                </p>
                <p className="text-[10px] text-neutral-400 truncate">
                  {img.desc}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
