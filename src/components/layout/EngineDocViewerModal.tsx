/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BookOpen, Search, X, Code, Shield, Cpu } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const EngineDocViewerModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [search, setSearch] = useState<string>('');

  if (!isOpen) return null;

  const docs = [
    {
      title: 'Aether2D Vector & Physics API',
      category: 'Game Engine',
      syntax: 'Aether2D.createRigidBody({ mass: 10, gravityScale: 1.0, restitution: 0.8 });',
      description: 'Creates a simulated rigid body with gravity, impulse dynamics, and floor/platform tile collision detection.'
    },
    {
      title: 'Aether3D Mesh & Skeletal Rigging',
      category: '3D Studio',
      syntax: 'Studio3D.addPrimitive("mech", { position: [0, 1, 0], scale: [1, 1, 1] });',
      description: 'Instantiates procedural 3D meshes (mechs, jets, tanks, skyscrapers) with PBR materials and bone animations.'
    },
    {
      title: 'CryptoJWTEngine Security API',
      category: 'Cryptography',
      syntax: 'await CryptoJWTEngine.signJWT(payload, secretKey);',
      description: 'Asynchronously signs HMAC-SHA256 tokens using browser Web Crypto API (crypto.subtle).'
    },
    {
      title: 'Python AST Runtime & Bridge',
      category: 'Scripting',
      syntax: 'ScriptRunner.executePython("print(\'Hello AetherForge\')");',
      description: 'Evaluates Python code using a sandboxed AST interpreter with safe stdout logging.'
    },
    {
      title: 'Lua 5.x Interpreter & Tables',
      category: 'Scripting',
      syntax: 'ScriptRunner.executeLua("local player = { x = 10, y = 20 }; print(player.x)");',
      description: 'Interprets Lua script blocks with support for global variable tables and function invocation.'
    }
  ];

  const filtered = docs.filter(d => 
    d.title.toLowerCase().includes(search.toLowerCase()) || 
    d.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-[#181a24] border border-[#2b2f40] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl text-xs text-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#252834]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">AetherForge Engine Technical API Documentation</h2>
              <p className="text-gray-400 text-[11px]">API reference guide for Aether2D, Aether3D, Physics, and Scripting Runtimes</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#252834] text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-[#252834]">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search API method or class..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#101217] border border-[#2c3142] rounded-lg text-white text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* List */}
        <div className="p-4 max-h-80 overflow-y-auto space-y-3">
          {filtered.map((item, i) => (
            <div key={i} className="p-3 bg-[#101217] rounded-lg border border-[#242736] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs">{item.title}</span>
                <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[10px]">{item.category}</span>
              </div>
              <p className="text-gray-300 text-[11px]">{item.description}</p>
              <pre className="p-2 bg-[#090a0d] rounded text-emerald-400 font-mono text-[10px] overflow-x-auto">
                {item.syntax}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
