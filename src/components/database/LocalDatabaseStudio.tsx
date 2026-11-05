/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  LocalDatabase,
  DBTable,
  createInitialDatabase
} from '../../types/database';
import { soundSynth } from '../../services/audio/synth';
import {
  Database,
  Table,
  Plus,
  Trash2,
  Play,
  Download,
  Filter,
  Search,
  Check,
  Terminal,
  FileSpreadsheet
} from 'lucide-react';

export const LocalDatabaseStudio: React.FC = () => {
  const [db, setDb] = useState<LocalDatabase>(() => createInitialDatabase());
  const [activeTableId, setActiveTableId] = useState<string>('tbl_users');
  const [sqlQuery, setSqlQuery] = useState<string>('SELECT * FROM users WHERE score > 800');
  const [queryResult, setQueryResult] = useState<any[] | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const activeTable = db.tables.find(t => t.id === activeTableId) || db.tables[0];

  // Execute Simulated SQL Query
  const handleExecuteSQL = () => {
    soundSynth.playLaser();
    const cleanQuery = sqlQuery.trim().toLowerCase();

    if (cleanQuery.includes('select') && cleanQuery.includes('users')) {
      const filtered = db.tables[0].rows.filter(r => {
        if (cleanQuery.includes('> 800')) return r.score > 800;
        if (cleanQuery.includes('is_premium')) return r.is_premium;
        return true;
      });
      setQueryResult(filtered);
    } else if (cleanQuery.includes('inventory')) {
      setQueryResult(db.tables[1].rows);
    } else {
      setQueryResult(activeTable.rows);
    }
  };

  // Add new row to active table
  const handleAddRow = () => {
    const newId = Date.now() % 10000;
    const newRow: Record<string, any> = {};
    activeTable.columns.forEach(col => {
      if (col.isPrimary) newRow[col.name] = newId;
      else if (col.type === 'INTEGER') newRow[col.name] = Math.floor(Math.random() * 500) + 10;
      else if (col.type === 'BOOLEAN') newRow[col.name] = true;
      else newRow[col.name] = `مورد جدید ${newId}`;
    });

    setDb(prev => ({
      ...prev,
      tables: prev.tables.map(t =>
        t.id === activeTable.id ? { ...t, rows: [...t.rows, newRow] } : t
      )
    }));
    soundSynth.playCoin();
  };

  // Export JSON
  const handleExportJSON = () => {
    const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(db, null, 2));
    const dl = document.createElement('a');
    dl.href = jsonStr;
    dl.download = 'aetherforge_database.json';
    dl.click();
    soundSynth.playPowerup();
  };

  // Export real SQLite .sql schema and insert dump
  const handleExportSQL = () => {
    let sql = `-- AetherForge Database SQL Dump\n-- Generated 100% Offline\n\n`;
    db.tables.forEach(table => {
      const colDefs = table.columns.map(c => `  "${c.name}" ${c.type}${c.isPrimary ? ' PRIMARY KEY' : ''}`).join(',\n');
      sql += `CREATE TABLE IF NOT EXISTS "${table.name.split(' ')[0]}" (\n${colDefs}\n);\n\n`;

      table.rows.forEach(row => {
        const cols = Object.keys(row).map(k => `"${k}"`).join(', ');
        const vals = Object.values(row).map(v => typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v).join(', ');
        sql += `INSERT INTO "${table.name.split(' ')[0]}" (${cols}) VALUES (${vals});\n`;
      });
      sql += '\n';
    });

    const blob = new Blob([sql], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'database_dump.sql';
    a.click();
    URL.revokeObjectURL(url);
    soundSynth.playPowerup();
  };

  // Generate 5 random mock rows
  const handleGenerateMockData = () => {
    soundSynth.playLaser();
    const usernames = ['reza_hero', 'cyber_knight', 'sara_dev', 'titan_99', 'shadow_ninja'];
    const newRows: Record<string, any>[] = [];

    for (let i = 0; i < 5; i++) {
      const newId = (Date.now() % 10000) + i;
      const row: Record<string, any> = {};
      activeTable.columns.forEach(col => {
        if (col.isPrimary) row[col.name] = newId;
        else if (col.type === 'INTEGER') row[col.name] = Math.floor(Math.random() * 2500) + 100;
        else if (col.type === 'BOOLEAN') row[col.name] = Math.random() > 0.4;
        else if (col.name === 'email') row[col.name] = `user_${newId}@game.local`;
        else if (col.name === 'username') row[col.name] = usernames[i % usernames.length] + '_' + newId;
        else row[col.name] = `آیتم تست شماره ${newId}`;
      });
      newRows.push(row);
    }

    setDb(prev => ({
      ...prev,
      tables: prev.tables.map(t =>
        t.id === activeTable.id ? { ...t, rows: [...t.rows, ...newRows] } : t
      )
    }));
  };

  const displayedRows = (queryResult || activeTable.rows).filter(row =>
    JSON.stringify(row).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full bg-[#121316] text-[#e1e4ea] select-none overflow-hidden">
      {/* Left: Table List & Management */}
      <div className="w-full md:w-64 bg-[#161821] border-b md:border-b-0 md:border-r border-[#262937] p-4 flex flex-col shrink-0">
        <div className="flex items-center justify-between pb-3 border-b border-[#292e3e] mb-4">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm text-white">دیتابیس محلی (SQLite / Mock DB)</h3>
          </div>
        </div>

        <p className="text-gray-400 text-xs mb-2">جدول‌های پایگاه داده:</p>
        <div className="space-y-1.5 flex-1">
          {db.tables.map(tbl => {
            const isSel = activeTableId === tbl.id;
            return (
              <button
                key={tbl.id}
                onClick={() => {
                  setActiveTableId(tbl.id);
                  setQueryResult(null);
                  soundSynth.playCoin();
                }}
                className={`w-full p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                  isSel
                    ? 'bg-amber-500/15 border-amber-500 text-white shadow-md'
                    : 'bg-[#1e212b] border-[#2c3140] text-gray-300 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Table className="w-3.5 h-3.5 text-amber-400" />
                  <span className="truncate">{tbl.name}</span>
                </div>
                <span className="text-[10px] text-gray-500 font-mono">{tbl.rows.length} ردیف</span>
              </button>
            );
          })}
        </div>

        {/* Export Buttons */}
        <div className="mt-4 pt-3 border-t border-[#292e3e] space-y-2">
          <button
            onClick={handleExportSQL}
            className="w-full py-2 rounded-lg bg-[#242735] hover:bg-[#2c3144] border border-[#343a4e] text-cyan-300 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md"
            title="دانلود فایل ساخت و داده SQLite (.sql)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>دانلود اسکریپت SQL</span>
          </button>
          <button
            onClick={handleExportJSON}
            className="w-full py-2 rounded-lg bg-[#1e202b] hover:bg-[#252836] border border-[#2d3244] text-gray-300 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
            <span>خروجی فرمت JSON</span>
          </button>
        </div>
      </div>

      {/* Right / Center: SQL Runner & Table Grid */}
      <div className="flex-1 flex flex-col bg-[#0b0c10] overflow-hidden">
        {/* SQL Query Bar */}
        <div className="p-3 bg-[#151720] border-b border-[#252836] flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center gap-2 w-full flex-1">
            <Terminal className="w-4 h-4 text-cyan-400 shrink-0" />
            <input
              type="text"
              value={sqlQuery}
              onChange={e => setSqlQuery(e.target.value)}
              placeholder="دستور SQL خود را بنویسید (مثال: SELECT * FROM users)..."
              className="w-full px-3 py-1.5 bg-[#0f1016] border border-[#2c3144] rounded-lg text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <button
            onClick={handleExecuteSQL}
            className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer shadow-md"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>اجرای کوئری SQL</span>
          </button>
        </div>

        {/* Table Actions Toolbar */}
        <div className="h-10 bg-[#12141c] border-b border-[#232736] flex items-center justify-between px-4 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-gray-200">{activeTable.name}</span>
            <div className="flex items-center gap-1.5 bg-[#1a1d28] px-2 py-0.5 rounded border border-[#2d3246]">
              <Search className="w-3 h-3 text-gray-400" />
              <input
                type="text"
                placeholder="جستجو در داده‌ها..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-transparent text-[11px] text-gray-200 focus:outline-none w-28"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateMockData}
              className="px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/40 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
              title="تولید ۵ سطر داده تستی تصادفی"
            >
              <span>+۵ داده تستی (Mock)</span>
            </button>

            <button
              onClick={handleAddRow}
              className="px-3 py-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>افزودن رکورد (+)</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-auto p-4">
          <div className="rounded-xl border border-[#262a39] overflow-hidden bg-[#13151e] shadow-xl">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[#1b1e2a] text-gray-300 border-b border-[#262a39]">
                  {activeTable.columns.map(col => (
                    <th key={col.id} className="p-3 font-semibold">
                      <div className="flex items-center gap-1">
                        <span>{col.name}</span>
                        <span className="text-[10px] text-gray-500 font-mono">({col.type})</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222533]">
                {displayedRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#1a1c27] transition-colors">
                    {activeTable.columns.map(col => (
                      <td key={col.id} className="p-3 font-mono text-gray-200">
                        {String(row[col.name] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
