import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limits for base64 image uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Database file path
const DB_FILE = path.join(process.cwd(), "admin_db.json");

// Types for DB
interface AdminDB {
  admin: {
    username: string;
    passwordHash: string; // Stored in plain text for simple implementation, or simple hash
  };
  keys: Array<{
    id: string;
    key: string;
    createdAt: string;
    status: 'active' | 'revoked';
  }>;
}

// Initialize database with default credentials
function initDB(): AdminDB {
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(content);
    } catch (e) {
      console.error("Failed to read DB file, resetting:", e);
    }
  }
  
  const defaultDB: AdminDB = {
    admin: {
      username: "admin",
      passwordHash: "admin123" // Default password
    },
    keys: [
      {
        id: "key-1",
        key: "KEY-INIT-9999",
        createdAt: new Date().toISOString(),
        status: "active"
      }
    ]
  };
  
  saveDB(defaultDB);
  return defaultDB;
}

function saveDB(db: AdminDB) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write to DB file:", e);
  }
}

// Initialize DB state
let dbState = initDB();

// ---------------- API ENDPOINTS ----------------

// 1. Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// 2. Admin Login
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "请输入账号和密码" });
  }

  dbState = initDB(); // reload to get freshest
  if (username === dbState.admin.username && password === dbState.admin.passwordHash) {
    return res.json({ success: true, username: dbState.admin.username });
  }

  return res.status(401).json({ error: "账号或密码错误" });
});

// 3. Admin Change password
app.post("/api/admin/change-password", (req, res) => {
  const { username, password, newUsername, newPassword } = req.body;
  
  dbState = initDB();
  if (username !== dbState.admin.username || password !== dbState.admin.passwordHash) {
    return res.status(401).json({ error: "当前账号或密码不正确，无法修改" });
  }

  if (newUsername) {
    dbState.admin.username = newUsername;
  }
  if (newPassword) {
    dbState.admin.passwordHash = newPassword;
  }

  saveDB(dbState);
  return res.json({ success: true, message: "修改成功" });
});

// 4. Generate & Manage Keys
app.get("/api/admin/keys", (req, res) => {
  dbState = initDB();
  res.json({ keys: dbState.keys });
});

app.post("/api/admin/keys", (req, res) => {
  const { prefix } = req.body;
  dbState = initDB();

  const randPart1 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const randPart2 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const newKey = `${prefix || "AI"}-${randPart1}-${randPart2}`;

  const keyItem = {
    id: "key-" + Date.now(),
    key: newKey,
    createdAt: new Date().toISOString(),
    status: "active" as const
  };

  dbState.keys.unshift(keyItem);
  saveDB(dbState);

  res.json({ success: true, key: keyItem });
});

app.delete("/api/admin/keys/:id", (req, res) => {
  const { id } = req.params;
  dbState = initDB();

  dbState.keys = dbState.keys.filter(k => k.id !== id);
  saveDB(dbState);

  res.json({ success: true });
});

app.put("/api/admin/keys/:id/toggle", (req, res) => {
  const { id } = req.params;
  dbState = initDB();

  dbState.keys = dbState.keys.map(k => {
    if (k.id === id) {
      return { ...k, status: k.status === 'active' ? 'revoked' : 'active' };
    }
    return k;
  });
  
  saveDB(dbState);
  res.json({ success: true });
});

// 5. Music Search (QQ with netease/meting fallback)
app.get("/api/music/search", async (req, res) => {
  const query = req.query.q as string;
  if (!query) {
    return res.status(400).json({ error: "Missing query parameter 'q'" });
  }

  console.log(`Music search request for: "${query}"`);

  // Try QQ Music (cyapi.top) first
  try {
    const apikey = "6308b8dd26a2bb1a0536cf8b2ecc97b9d9f0a1e78dfdf25b3bb62f452d428489";
    const qqUrl = `https://cyapi.top/API/qq_music.php?apikey=${apikey}&msg=${encodeURIComponent(query)}&num=15&type=json`;
    console.log(`Calling QQ Music API: ${qqUrl}`);
    const qqResponse = await fetch(qqUrl);
    
    if (qqResponse.ok) {
      const data = await qqResponse.json();
      console.log(`QQ Music search success, returned songs: ${data?.list?.length || 0}`);
      
      if (data?.list && Array.isArray(data.list) && data.list.length > 0) {
        const songs = data.list.map((item: any) => ({
          id: item.id,
          name: item.name,
          artists: item.artists,
          cover: item.cover,
          source: 'qq' as const
        }));
        return res.json({ songs });
      }
    }
  } catch (err: any) {
    console.error("QQ Music search failed:", err.message);
  }

  // Fallback to Meting (NetEase Search)
  try {
    const metingUrl = `https://api.i-meto.com/meting/api?server=netease&type=search&id=${encodeURIComponent(query)}`;
    console.log(`Calling Meting fallback search API: ${metingUrl}`);
    const metingResponse = await fetch(metingUrl);
    
    if (metingResponse.ok) {
      const data = await metingResponse.json();
      console.log(`Meting responded with list count: ${data?.length || 0}`);
      
      if (Array.isArray(data) && data.length > 0) {
        const songs = data.map((item: any) => ({
          id: item.id,
          name: item.title,
          artists: item.author,
          cover: item.pic,
          source: 'netease' as const
        }));
        return res.json({ songs });
      }
    }
  } catch (err: any) {
    console.error("Meting search failed:", err.message);
  }

  return res.json({ songs: [] });
});

// 6. Music detail resolution (with fallback)
app.get("/api/music/detail", async (req, res) => {
  const { id, source } = req.query;
  if (!id) {
    return res.status(400).json({ error: "Missing parameter 'id'" });
  }

  console.log(`Music detail request for id: "${id}", source: "${source}"`);

  // Try QQ resolution first if the source is qq or unspecified
  if (source === 'qq' || !source) {
    try {
      const apikey = "6308b8dd26a2bb1a0536cf8b2ecc97b9d9f0a1e78dfdf25b3bb62f452d428489";
      const qqUrl = `https://cyapi.top/API/qq_music.php?apikey=${apikey}&mid=${id}&type=json`;
      console.log(`Calling QQ mid detail resolution: ${qqUrl}`);
      const qqResponse = await fetch(qqUrl);
      
      if (qqResponse.ok) {
        const data = await qqResponse.json();
        if (data && data.url) {
          console.log("QQ Music mid resolved playable URL successfully.");
          return res.json({
            id: data.id,
            name: data.name,
            artists: Array.isArray(data.artists) ? data.artists.map((a: any) => a.name).join(", ") : data.artists,
            cover: data.cover?.large || data.cover?.medium || data.cover?.small || "",
            url: data.url,
            lyric: data.lyric?.text || "",
            source: 'qq'
          });
        }
      }
      console.log("QQ Music resolution returned empty url, falling back to Meting...");
    } catch (err: any) {
      console.error("QQ Music resolution error:", err.message);
    }
  }

  // Fallback to Meting (NetEase Song + URL)
  try {
    const metingUrl = `https://api.i-meto.com/meting/api?server=netease&type=url&id=${id}`;
    console.log(`Calling Meting URL resolver: ${metingUrl}`);
    const metingResponse = await fetch(metingUrl);
    let playUrl = "";
    if (metingResponse.ok) {
      const urlData = await metingResponse.json();
      playUrl = urlData.url || (Array.isArray(urlData) ? urlData[0]?.url : "");
    }

    let lyricText = "";
    try {
      const lyricUrl = `https://api.i-meto.com/meting/api?server=netease&type=lyric&id=${id}`;
      const lrcRes = await fetch(lyricUrl);
      if (lrcRes.ok) {
        const lrcData = await lrcRes.json();
        lyricText = lrcData.lyric || "";
      }
    } catch (e) {}

    // Get basic detail too (pic, title, author)
    let songInfo: any = {};
    try {
      const songInfoUrl = `https://api.i-meto.com/meting/api?server=netease&type=song&id=${id}`;
      const songInfoRes = await fetch(songInfoUrl);
      if (songInfoRes.ok) {
        const infoData = await songInfoRes.json();
        const singleInfo = Array.isArray(infoData) ? infoData[0] : infoData;
        songInfo = {
          name: singleInfo?.title || singleInfo?.name || "",
          artists: singleInfo?.author || singleInfo?.artist || "",
          cover: singleInfo?.pic || ""
        };
      }
    } catch (e) {}

    if (playUrl) {
      console.log("Meting fallback resolved play url successfully.");
      return res.json({
        id,
        name: songInfo.name || "Fallback Audio",
        artists: songInfo.artists || "NetEase fallback",
        cover: songInfo.cover || "",
        url: playUrl,
        lyric: lyricText,
        source: 'netease'
      });
    }
  } catch (err: any) {
    console.error("Meting fallback detail resolution failed:", err.message);
  }

  return res.status(404).json({ error: "无法解析该歌曲的播放源" });
});

// 7. Analyze photo & emotion (AI endpoint)
app.post("/api/gemini/analyze", async (req, res) => {
  const { image, emotion, customConfig } = req.body;

  if (!image || !emotion) {
    return res.status(400).json({ error: "Missing image base64 or emotion" });
  }

  // Parse image base64
  let mimeType = "image/jpeg";
  let base64Data = image;

  const match = image.match(/^data:([^;]+);base64,(.+)$/);
  if (match) {
    mimeType = match[1];
    base64Data = match[2];
  }

  // Check if user has specified custom config
  const useCustom = customConfig && customConfig.provider && customConfig.provider !== "gemini";

  if (useCustom) {
    const { provider, baseUrl, model, apiKey } = customConfig;
    console.log(`Using custom AI provider: ${provider} with model ${model} at ${baseUrl}`);
    
    try {
      // Build an OpenAI compatible API call
      const cleanBase64 = image.startsWith("data:") ? image : `data:${mimeType};base64,${base64Data}`;
      
      const payload = {
        model: model,
        messages: [
          {
            role: "system",
            content: "You are an AI-driven Music Vibe Analyzer. Analyze the visual elements, colors, and selected emotion of the user's photo. You MUST respond with a valid JSON object only. No markdown formatting, no backticks."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this image and the selected emotion: "${emotion}". Create a custom music soundtrack mood. Return a JSON object with this exact schema:
{
  "emotion": "Selected emotion in English",
  "emotionZh": "Selected emotion in Chinese",
  "tags": ["3-5 visual or emotion tags in Chinese"],
  "searchQuery": "3-5 word search query for music matching e.g. '轻快 尤克里里 海滩'",
  "title": "Evocative mood title in Chinese or English",
  "description": "Poetic explanation in Chinese of why this music fits the visual scene and emotion"
}`
              },
              {
                type: "image_url",
                image_url: {
                  url: cleanBase64
                }
              }
            ]
          }
        ],
        response_format: { type: "json_object" }
      };

      const customResponse = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey || process.env.GEMINI_API_KEY || ""}`
        },
        body: JSON.stringify(payload)
      });

      if (customResponse.ok) {
        const responseJson = await customResponse.json();
        const contentStr = responseJson.choices?.[0]?.message?.content || "";
        console.log(`Custom AI parsed contentStr: ${contentStr}`);
        
        // Parse custom JSON string
        try {
          const parsedResult = JSON.parse(contentStr.replace(/```json|```/g, "").trim());
          return res.json(parsedResult);
        } catch (parseErr) {
          console.error("Failed to parse JSON response from custom model, returned raw:", contentStr);
          // Try regex extract
          const matchJson = contentStr.match(/\{[\s\S]*\}/);
          if (matchJson) {
            const parsedResult = JSON.parse(matchJson[0]);
            return res.json(parsedResult);
          }
          throw new Error("Could not parse JSON from custom AI");
        }
      } else {
        const errorText = await customResponse.text();
        console.error(`Custom provider call failed with status ${customResponse.status}:`, errorText);
        throw new Error(`Custom AI provider failed: ${customResponse.statusText}`);
      }

    } catch (customErr: any) {
      console.warn("Custom AI model failed, falling back to Gemini API default:", customErr.message);
      // Fallback to Gemini handled below
    }
  }

  // Default Gemini API implementation using @google/genai
  try {
    console.log("Calling Gemini API default model (gemini-3.6-flash)...");
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in environment variables");
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        },
        {
          text: `Analyze this photo and the selected emotion: "${emotion}". Generate a perfect musical pairing for this scene and mood. Return the result in a structured JSON schema.`
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            emotion: { type: Type.STRING, description: "The English name of the selected emotion" },
            emotionZh: { type: Type.STRING, description: "The Chinese name of the selected emotion" },
            tags: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "3-5 descriptive visual or emotional keyword tags (in Chinese)" 
            },
            searchQuery: { 
              type: Type.STRING, 
              description: "A 3-5 word search query for a Chinese/Western music database to find matching songs (e.g. '宁静的夏天 纯音乐吉他' or '欢快 尤克里里 轻快')" 
            },
            title: { type: Type.STRING, description: "An evocative title for this musical mood vibe (in Chinese or English)" },
            description: { type: Type.STRING, description: "A poetic description (in Chinese) explaining why this music fits the visual scene and emotion" }
          },
          required: ["emotion", "emotionZh", "tags", "searchQuery", "title", "description"]
        }
      }
    });

    const resultText = response.text || "{}";
    const resultObj = JSON.parse(resultText);
    return res.json(resultObj);

  } catch (err: any) {
    console.error("Gemini API call failed:", err);
    return res.status(500).json({ error: "AI 分析失败，请检查 GEMINI_API_KEY 配置: " + err.message });
  }
});


// ---------------- START SERVER AND VITE MIDDLEWARE ----------------

async function startServer() {
  // Ensure DB initialized
  dbState = initDB();

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Running in development mode. Initializing Vite...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Running in production mode. Serving static files...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
