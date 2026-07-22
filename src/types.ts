export interface AIConfig {
  provider: string; // e.g., 'gemini', 'openai', 'custom'
  baseUrl: string;  // e.g., 'https://api.openai.com/v1' or custom
  model: string;    // e.g., 'gpt-4o', 'deepseek-chat', etc.
}

export interface AnalysisResult {
  emotion: string;         // e.g., 'Romantic'
  emotionZh: string;       // e.g., '浪漫'
  tags: string[];          // e.g., ['sunset', 'waves', 'warmth']
  searchQuery: string;     // e.g., 'acoustic guitar gentle sunset waves'
  title: string;           // e.g., 'Golden Hour Whisper'
  description: string;     // e.g., '一首温柔的吉他曲，伴着落日的余晖和海浪的呢喃...'
}

export interface Song {
  id: string;
  name: string;
  artists: string;
  cover: string;
  url?: string;
  lyric?: string;
  source: 'qq' | 'netease' | 'fallback';
}

export interface KeyItem {
  id: string;
  key: string;
  createdAt: string;
  status: 'active' | 'revoked';
}
