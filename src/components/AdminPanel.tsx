import React, { useState, useEffect } from "react";
import { Key, Lock, User, Plus, Trash2, KeyRound, ShieldAlert, CheckCircle, RefreshCw } from "lucide-react";
import { KeyItem } from "../types";

export default function AdminPanel() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  
  // Dashboards Tabs
  const [activeTab, setActiveTab] = useState<"keys" | "credentials">("keys");

  // Key stats
  const [keysList, setKeysList] = useState<KeyItem[]>([]);
  const [keyPrefix, setKeyPrefix] = useState("VIBE");
  const [isGenerating, setIsGenerating] = useState(false);

  // Credentials form
  const [curUsername, setCurUsername] = useState("");
  const [curPassword, setCurPassword] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [credMessage, setCredMessage] = useState("");
  const [credError, setCredError] = useState("");

  // Check login on load
  useEffect(() => {
    const loggedAdmin = localStorage.getItem("admin_logged_user");
    if (loggedAdmin) {
      setIsLoggedIn(true);
      fetchKeys();
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsLoggedIn(true);
        localStorage.setItem("admin_logged_user", data.username);
        fetchKeys();
      } else {
        setLoginError(data.error || "账户或密码错误");
      }
    } catch (err) {
      setLoginError("连接服务器失败，请稍后重试");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem("admin_logged_user");
  };

  // Fetch keys list
  const fetchKeys = async () => {
    try {
      const res = await fetch("/api/admin/keys");
      const data = await res.json();
      if (res.ok) {
        setKeysList(data.keys || []);
      }
    } catch (err) {
      console.error("Failed to fetch keys", err);
    }
  };

  // Generate a key
  const handleGenerateKey = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/admin/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefix: keyPrefix })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setKeysList(prev => [data.key, ...prev]);
      }
    } catch (err) {
      console.error("Failed to generate key", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Delete key
  const handleDeleteKey = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/keys/${id}`, { method: "DELETE" });
      if (res.ok) {
        setKeysList(prev => prev.filter(k => k.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete key", err);
    }
  };

  // Toggle active/revoked
  const handleToggleKey = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/keys/${id}/toggle`, { method: "PUT" });
      if (res.ok) {
        setKeysList(prev => prev.map(k => {
          if (k.id === id) {
            return { ...k, status: k.status === 'active' ? 'revoked' : 'active' };
          }
          return k;
        }));
      }
    } catch (err) {
      console.error("Failed to toggle key", err);
    }
  };

  // Change password credentials
  const handleChangeCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredMessage("");
    setCredError("");

    if (!newUsername && !newPassword) {
      setCredError("请输入要修改的新账号或新密码");
      return;
    }

    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: curUsername,
          password: curPassword,
          newUsername: newUsername || undefined,
          newPassword: newPassword || undefined
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCredMessage("管理员凭证修改成功！请牢记新凭证。");
        setCurUsername("");
        setCurPassword("");
        setNewUsername("");
        setNewPassword("");
        
        // Re-authenticate silently or let them stay logged in
        localStorage.setItem("admin_logged_user", newUsername || localStorage.getItem("admin_logged_user") || "admin");
      } else {
        setCredError(data.error || "修改失败，当前账号密码输入错误");
      }
    } catch (err) {
      setCredError("连接服务器失败");
    }
  };

  // Login view
  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-2xl border border-neutral-200/80 p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-3 text-neutral-800">
            <Lock className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-neutral-800">安全后台管理登录</h2>
          <p className="text-xs text-neutral-400 mt-1">
            仅限授权管理员登录以管理模型Key生成与安全参数配置。
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1.5 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-neutral-400" /> 登录账号
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="默认账号: admin"
              required
              className="w-full text-xs rounded-lg border border-neutral-200 px-3.5 py-2.5 text-neutral-700 focus:outline-none focus:border-neutral-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1.5 flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5 text-neutral-400" /> 登录密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="默认密码: admin123"
              required
              className="w-full text-xs rounded-lg border border-neutral-200 px-3.5 py-2.5 text-neutral-700 focus:outline-none focus:border-neutral-800"
            />
          </div>

          {loginError && (
            <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-[11px] font-medium flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold transition mt-2 shadow-sm"
          >
            安全登录
          </button>
        </form>
      </div>
    );
  }

  // Dashboard view
  return (
    <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-100 pb-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-neutral-800 flex items-center gap-2">
            <Lock className="w-5 h-5 text-neutral-700" />
            后台安全管理系统
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            管理员: <span className="font-bold text-neutral-600">{localStorage.getItem("admin_logged_user")}</span> · 可在此管理Key的生成以及密码修改。
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="px-3.5 py-1.5 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-full text-xs font-semibold transition"
        >
          退出管理
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-neutral-100 pb-3 mb-5">
        <button
          type="button"
          onClick={() => setActiveTab("keys")}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
            activeTab === "keys"
              ? "bg-neutral-900 text-white shadow-sm"
              : "text-neutral-500 hover:bg-neutral-50"
          }`}
        >
          授权 Key 管理
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("credentials")}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
            activeTab === "credentials"
              ? "bg-neutral-900 text-white shadow-sm"
              : "text-neutral-500 hover:bg-neutral-50"
          }`}
        >
          修改管理员账密
        </button>
      </div>

      {/* TAB 1: Key Generator Dashboard */}
      {activeTab === "keys" && (
        <div className="space-y-6">
          {/* Key Generator Controls */}
          <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100 flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-600">
                Key 自定义前缀
              </label>
              <input
                type="text"
                value={keyPrefix}
                onChange={(e) => setKeyPrefix(e.target.value.toUpperCase().slice(0, 8))}
                placeholder="前缀, 例如: VIBE"
                className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-700 font-bold focus:outline-none focus:border-neutral-800"
              />
            </div>
            <button
              type="button"
              onClick={handleGenerateKey}
              disabled={isGenerating}
              className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {isGenerating ? "正在生成..." : "一键生成新 Key"}
            </button>
          </div>

          {/* Key Table List */}
          <div className="border border-neutral-100 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-600 border-collapse">
                <thead className="bg-neutral-50 text-neutral-500 font-semibold uppercase tracking-wider border-b border-neutral-100">
                  <tr>
                    <th className="py-3 px-4">生成的授权 Key</th>
                    <th className="py-3 px-4">生成时间</th>
                    <th className="py-3 px-4">状态</th>
                    <th className="py-3 px-4 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {keysList.length > 0 ? (
                    keysList.map((item) => (
                      <tr key={item.id} className="hover:bg-neutral-50/50 transition">
                        <td className="py-3 px-4 font-mono font-bold text-neutral-800">
                          {item.key}
                        </td>
                        <td className="py-3 px-4 text-neutral-400">
                          {new Date(item.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => handleToggleKey(item.id)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.status === 'active'
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                : "bg-neutral-100 text-neutral-500 border border-neutral-200"
                            }`}
                          >
                            {item.status === 'active' ? "使用中" : "已失效"}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteKey(item.id)}
                            className="p-1 text-neutral-400 hover:text-rose-600 rounded transition"
                            title="永久删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-neutral-400 italic">
                        暂无生成的 Key 列表。点击上方按钮生成一个。
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Change Password Dashboard */}
      {activeTab === "credentials" && (
        <form onSubmit={handleChangeCredentials} className="space-y-4 max-w-lg">
          <div className="p-4 bg-amber-50/60 border border-amber-100/80 rounded-xl text-amber-700 text-xs leading-relaxed">
            修改管理员账密是即时生效的。请注意不要泄露你的新账密，并且牢记。
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5">
                当前管理员账号
              </label>
              <input
                type="text"
                value={curUsername}
                onChange={(e) => setCurUsername(e.target.value)}
                placeholder="旧账号"
                required
                className="w-full text-xs rounded-lg border border-neutral-200 px-3 py-2 text-neutral-700 focus:outline-none focus:border-neutral-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5">
                当前密码
              </label>
              <input
                type="password"
                value={curPassword}
                onChange={(e) => setCurPassword(e.target.value)}
                placeholder="旧密码"
                required
                className="w-full text-xs rounded-lg border border-neutral-200 px-3 py-2 text-neutral-700 focus:outline-none focus:border-neutral-800"
              />
            </div>
          </div>

          <hr className="border-neutral-100 my-2" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5">
                修改后的新账号 (选填)
              </label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="留空则不修改账号"
                className="w-full text-xs rounded-lg border border-neutral-200 px-3 py-2 text-neutral-700 focus:outline-none focus:border-neutral-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5">
                修改后的新密码 (选填)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="留空则不修改密码"
                className="w-full text-xs rounded-lg border border-neutral-200 px-3 py-2 text-neutral-700 focus:outline-none focus:border-neutral-800"
              />
            </div>
          </div>

          {credMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-600 text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{credMessage}</span>
            </div>
          )}

          {credError && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-xs font-semibold flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{credError}</span>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold transition shadow-sm"
            >
              确认修改安全凭证
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
