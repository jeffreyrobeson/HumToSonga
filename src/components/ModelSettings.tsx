import React, { useState, useEffect } from "react";
import { Settings, Shield, Trash2, CheckCircle } from "lucide-react";
import { AIConfig } from "../types";

interface ModelSettingsProps {
  onConfigChange: (config: AIConfig & { apiKey?: string }) => void;
}

const DEFAULT_CONFIG = {
  provider: "gemini",
  baseUrl: "",
  model: "gemini-3.6-flash",
  apiKey: ""
};

export default function ModelSettings({ onConfigChange }: ModelSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [provider, setProvider] = useState("gemini");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("gemini-3.6-flash");
  const [apiKey, setApiKey] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem("custom_ai_config");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProvider(parsed.provider || "gemini");
        setBaseUrl(parsed.baseUrl || "");
        setModel(parsed.model || "gemini-3.6-flash");
        setApiKey(parsed.apiKey || "");
        onConfigChange(parsed);
      } catch (e) {
        console.error("Failed to parse saved config", e);
      }
    }
  }, []);

  const handleSave = () => {
    const newConfig = {
      provider,
      baseUrl: provider === "gemini" ? "" : baseUrl,
      model,
      apiKey
    };
    localStorage.setItem("custom_ai_config", JSON.stringify(newConfig));
    onConfigChange(newConfig);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleClear = () => {
    setProvider("gemini");
    setBaseUrl("");
    setModel("gemini-3.6-flash");
    setApiKey("");
    localStorage.removeItem("custom_ai_config");
    onConfigChange({
      provider: "gemini",
      baseUrl: "",
      model: "gemini-3.6-flash",
      apiKey: ""
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="text-base font-semibold text-neutral-800 flex items-center gap-2">
          <Settings className="w-4.5 h-4.5 text-neutral-500" />
          AI 驱动模型参数配置
        </h3>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="text-xs text-neutral-500 hover:text-neutral-800 font-medium underline"
        >
          {isOpen ? "收起面板" : "展开配置"}
        </button>
      </div>

      <p className="text-xs text-neutral-400 mb-4">
        默认使用内置的 **Google Gemini (3.6-Flash)**。支持临时切换到 OpenAI 或兼容第三方的大模型。
      </p>

      {isOpen && (
        <div className="space-y-4 pt-3 border-t border-neutral-100 animate-fadeIn">
          {/* 1. Provider Select */}
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1.5">
              提供商 (AI Provider)
            </label>
            <select
              value={provider}
              onChange={(e) => {
                const val = e.target.value;
                setProvider(val);
                if (val === "gemini") {
                  setModel("gemini-3.6-flash");
                  setBaseUrl("");
                } else if (val === "openai") {
                  setModel("gpt-4o");
                  setBaseUrl("https://api.openai.com/v1");
                } else {
                  setModel("");
                  setBaseUrl("");
                }
              }}
              className="w-full text-xs rounded-lg border border-neutral-200 bg-white px-3 py-2 text-neutral-700 focus:outline-none focus:border-neutral-800"
            >
              <option value="gemini">内置 Google Gemini (官方推荐)</option>
              <option value="openai">官方 OpenAI 接口</option>
              <option value="custom">第三方 OpenAI 兼容提供商 (DeepSeek / 阿里 / 月之暗面)</option>
            </select>
          </div>

          {/* 2. BASE_URL */}
          {provider !== "gemini" && (
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5">
                大模型兼容接口地址 (BASE_URL)
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.deepseek.com/v1"
                className="w-full text-xs rounded-lg border border-neutral-200 px-3 py-2 text-neutral-700 focus:outline-none focus:border-neutral-800"
              />
            </div>
          )}

          {/* 3. MODEL */}
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1.5">
              指定模型名称 (MODEL)
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={provider === "gemini" ? "gemini-3.6-flash" : "deepseek-chat"}
              className="w-full text-xs rounded-lg border border-neutral-200 px-3 py-2 text-neutral-700 focus:outline-none focus:border-neutral-800"
            />
          </div>

          {/* 4. API Key (Optional) */}
          {provider !== "gemini" && (
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-neutral-400" />
                临时大模型密钥 (Custom API Key)
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full text-xs rounded-lg border border-neutral-200 px-3 py-2 text-neutral-700 focus:outline-none focus:border-neutral-800"
              />
              <p className="text-[10px] text-neutral-400 mt-1">
                此 API Key 仅保存在你的浏览器缓存，安全且不会泄露。
              </p>
            </div>
          )}

          {/* Save/Clear Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-1.5 bg-neutral-50 hover:bg-neutral-100 text-neutral-500 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
            >
              <Trash2 className="w-3.5 h-3.5" /> 清除配置
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-sm"
            >
              保存模型参数
            </button>
          </div>

          {isSaved && (
            <div className="flex items-center justify-end gap-1.5 text-xs text-neutral-600">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>模型参数更新并应用成功！</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
