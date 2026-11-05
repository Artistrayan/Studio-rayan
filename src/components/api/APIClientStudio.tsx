/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { soundSynth } from '../../services/audio/synth';
import {
  Send,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  Code2,
  Copy,
  Check,
  RefreshCw,
  Globe
} from 'lucide-react';

interface RequestHistoryItem {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  status?: number;
  time?: number;
  response?: string;
  timestamp: string;
}

export const APIClientStudio: React.FC = () => {
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET');
  const [url, setUrl] = useState<string>('https://jsonplaceholder.typicode.com/posts/1');
  const [headers, setHeaders] = useState<string>('{\n  "Content-Type": "application/json"\n}');
  const [body, setBody] = useState<string>('{\n  "title": "AetherForge Game Score",\n  "score": 9500,\n  "userId": 1\n}');
  const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'body'>('params');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [responseBody, setResponseBody] = useState<string>('');
  const [history, setHistory] = useState<RequestHistoryItem[]>([
    {
      id: 'h1',
      method: 'GET',
      url: 'https://api.github.com/repos/facebook/react',
      status: 200,
      time: 145,
      timestamp: '14:20'
    }
  ]);
  const [copied, setCopied] = useState<boolean>(false);

  // Send real network request or fallback for sandbox
  const handleSendRequest = async () => {
    setIsLoading(true);
    setResponseStatus(null);
    setResponseBody('');
    const startTime = performance.now();
    soundSynth.playLaser();

    try {
      const options: RequestInit = {
        method
      };

      if (method !== 'GET') {
        try {
          options.body = body;
        } catch (e) {}
      }

      try {
        const parsedHeaders = JSON.parse(headers);
        options.headers = parsedHeaders;
      } catch (e) {}

      const res = await fetch(url, options);
      const elapsed = Math.round(performance.now() - startTime);
      setResponseStatus(res.status);
      setResponseTime(elapsed);

      const text = await res.text();
      try {
        const json = JSON.parse(text);
        setResponseBody(JSON.stringify(json, null, 2));
      } catch (e) {
        setResponseBody(text);
      }

      soundSynth.playWin();

      // Add to history
      setHistory(prev => [
        {
          id: `h_${Date.now()}`,
          method,
          url,
          status: res.status,
          time: elapsed,
          timestamp: new Date().toLocaleTimeString().slice(0, 5)
        },
        ...prev.slice(0, 9)
      ]);
    } catch (err: any) {
      const elapsed = Math.round(performance.now() - startTime);
      setResponseStatus(0);
      setResponseTime(elapsed);
      setResponseBody(`خطا در ارسال درخواست شبکه:\n${err.message}\n(توجه: به دلیل قوانین امنیتی مرورگر، ممکن است دامنه مورد نظر CORS Header ارسال نکرده باشد).`);
      soundSynth.playExplosion();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyResponse = () => {
    navigator.clipboard.writeText(responseBody);
    setCopied(true);
    soundSynth.playCoin();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full bg-[#121316] text-[#e1e4ea] select-none overflow-hidden">
      {/* Left: History & Saved Requests */}
      <div className="w-full md:w-64 bg-[#161821] border-b md:border-b-0 md:border-r border-[#262937] p-4 flex flex-col shrink-0">
        <div className="flex items-center justify-between pb-3 border-b border-[#292e3e] mb-4">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-sm text-white">تست‌کننده API (Postman)</h3>
          </div>
        </div>

        <p className="text-gray-400 text-xs mb-2">تاریخچه درخواست‌ها:</p>
        <div className="space-y-1.5 flex-1 overflow-y-auto">
          {history.map(item => (
            <div
              key={item.id}
              onClick={() => {
                setMethod(item.method);
                setUrl(item.url);
                soundSynth.playCoin();
              }}
              className="p-2 rounded-lg bg-[#1a1d28] hover:bg-[#232736] border border-[#2c3144] cursor-pointer text-xs"
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`font-bold font-mono text-[10px] ${
                  item.method === 'GET' ? 'text-emerald-400' : item.method === 'POST' ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {item.method}
                </span>
                <span className="text-[10px] text-gray-500 font-mono">{item.status || 'ERR'}</span>
              </div>
              <p className="text-gray-400 truncate text-[11px] font-mono">{item.url}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right / Center: Request Builder & Response Inspector */}
      <div className="flex-1 flex flex-col bg-[#0b0c10] overflow-hidden">
        {/* URL Bar */}
        <div className="p-3 bg-[#151720] border-b border-[#252836] flex items-center gap-2">
          {/* Method Select */}
          <select
            value={method}
            onChange={e => setMethod(e.target.value as any)}
            className="px-3 py-2 bg-[#1c1f2b] border border-[#2f354a] rounded-lg text-xs font-bold font-mono text-emerald-400 focus:outline-none"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>

          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://api.example.com/v1/resource"
            className="flex-1 px-3 py-2 bg-[#0e1017] border border-[#2a3044] rounded-lg text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
          />

          <button
            onClick={handleSendRequest}
            disabled={isLoading}
            className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shrink-0 cursor-pointer shadow-md disabled:opacity-50"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>ارسال درخواست</span>
          </button>
        </div>

        {/* Request Tabs (Headers, Body) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Sub-panel: Request configuration */}
          <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-[#262937] p-4">
            <div className="flex items-center gap-2 mb-3 border-b border-[#262937] pb-2 text-xs">
              <button
                onClick={() => setActiveTab('params')}
                className={`px-3 py-1 rounded ${activeTab === 'params' ? 'bg-indigo-500/20 text-indigo-400' : 'text-gray-400'}`}
              >
                Headers
              </button>
              <button
                onClick={() => setActiveTab('body')}
                className={`px-3 py-1 rounded ${activeTab === 'body' ? 'bg-indigo-500/20 text-indigo-400' : 'text-gray-400'}`}
              >
                Body (JSON)
              </button>
            </div>

            {activeTab === 'params' ? (
              <textarea
                value={headers}
                onChange={e => setHeaders(e.target.value)}
                className="flex-1 bg-[#12141c] p-3 rounded-xl border border-[#262a39] font-mono text-xs text-cyan-300 resize-none focus:outline-none"
              />
            ) : (
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                className="flex-1 bg-[#12141c] p-3 rounded-xl border border-[#262a39] font-mono text-xs text-amber-300 resize-none focus:outline-none"
              />
            )}
          </div>

          {/* Right Sub-panel: Live Response */}
          <div className="flex-1 flex flex-col p-4 bg-[#08090d]">
            <div className="flex items-center justify-between pb-3 border-b border-[#262937] mb-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-bold text-gray-200">پاسخ دریافتی (Response):</span>
                {responseStatus !== null && (
                  <span className={`font-mono px-2 py-0.5 rounded text-[11px] font-bold ${
                    responseStatus >= 200 && responseStatus < 300
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  }`}>
                    {responseStatus} OK
                  </span>
                )}
                {responseTime !== null && (
                  <span className="text-gray-500 font-mono text-[11px]">{responseTime}ms</span>
                )}
              </div>

              {responseBody && (
                <button
                  onClick={handleCopyResponse}
                  className="px-2.5 py-1 rounded bg-[#1e212b] hover:bg-[#282d3c] text-gray-300 text-[11px] flex items-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'کپی شد' : 'کپی JSON'}</span>
                </button>
              )}
            </div>

            <pre className="flex-1 bg-[#12141c] p-3 rounded-xl border border-[#262a39] font-mono text-xs text-emerald-300 overflow-auto whitespace-pre leading-relaxed">
              {responseBody || '// منتظر ارسال درخواست...'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
