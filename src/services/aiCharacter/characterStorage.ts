/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CharacterProfile, OutputItem, WorkflowTask } from './types';
import { IdentityEngine } from './identityEngine';

const DB_NAME = 'AetherForge_AI_Character_DB';
const DB_VERSION = 1;
const STORE_CHARACTERS = 'characters';
const STORE_GALLERY = 'gallery_outputs';
const STORE_TASKS = 'workflow_tasks';
const STORE_CONFIG = 'studio_config';

export class CharacterStorageEngine {
  private db: IDBDatabase | null = null;
  private isReady: boolean = false;
  private initPromise: Promise<void>;

  constructor() {
    this.initPromise = this.initDB();
  }

  private initDB(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        console.warn('[CharacterStorage] IndexedDB unavailable in environment.');
        resolve();
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e: IDBVersionChangeEvent) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_CHARACTERS)) {
          db.createObjectStore(STORE_CHARACTERS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_GALLERY)) {
          db.createObjectStore(STORE_GALLERY, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_TASKS)) {
          db.createObjectStore(STORE_TASKS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_CONFIG)) {
          db.createObjectStore(STORE_CONFIG, { keyPath: 'key' });
        }
      };

      request.onsuccess = (e: Event) => {
        this.db = (e.target as IDBOpenDBRequest).result;
        this.isReady = true;
        resolve();
      };

      request.onerror = (e) => {
        console.warn('[CharacterStorage] IndexedDB open error', e);
        resolve();
      };
    });
  }

  public async ensureReady(): Promise<void> {
    await this.initPromise;
  }

  // ==========================================
  // CHARACTER PROFILES MANAGEMENT
  // ==========================================

  public async getCharacters(): Promise<CharacterProfile[]> {
    await this.ensureReady();
    if (!this.db) return this.getDefaultCharacters();

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(STORE_CHARACTERS, 'readonly');
        const store = tx.objectStore(STORE_CHARACTERS);
        const req = store.getAll();
        req.onsuccess = () => {
          if (req.result && req.result.length > 0) {
            resolve(req.result);
          } else {
            // Seed defaults on initial launch
            const defaults = this.getDefaultCharacters();
            this.saveCharactersBatch(defaults).then(() => resolve(defaults));
          }
        };
        req.onerror = () => resolve(this.getDefaultCharacters());
      } catch (e) {
        resolve(this.getDefaultCharacters());
      }
    });
  }

  public async saveCharacter(character: CharacterProfile): Promise<void> {
    await this.ensureReady();
    character.updatedAt = Date.now();
    character.version = (character.version || 1) + 1;

    if (!this.db) return;
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db!.transaction(STORE_CHARACTERS, 'readwrite');
        const store = tx.objectStore(STORE_CHARACTERS);
        const req = store.put(character);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (e) {
        resolve();
      }
    });
  }

  public async deleteCharacter(id: string): Promise<void> {
    await this.ensureReady();
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db!.transaction(STORE_CHARACTERS, 'readwrite');
        const store = tx.objectStore(STORE_CHARACTERS);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (e) {
        resolve();
      }
    });
  }

  private async saveCharactersBatch(characters: CharacterProfile[]): Promise<void> {
    if (!this.db) return;
    try {
      const tx = this.db.transaction(STORE_CHARACTERS, 'readwrite');
      const store = tx.objectStore(STORE_CHARACTERS);
      characters.forEach(c => store.put(c));
    } catch (e) {
      // Ignored in safe fallback
    }
  }

  public getDefaultCharacters(): CharacterProfile[] {
    const char1Ref = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80';
    const char2Ref = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80';

    return [
      {
        id: 'char_aria_vance',
        name: 'Aria Vance',
        age: 26,
        gender: 'Female',
        ethnicity: 'East-Asian / European Blend',
        hairStyle: 'Asymmetrical bob with shaved neon undercut',
        hairColor: 'Silver Chrome & Neon Cyan Highlights',
        eyeColor: 'Vibrant Amber Gold',
        defaultOutfit: 'Matte-black ballistic carbon fiber jacket with luminous fiber-optic seam piping',
        facialFeatures: 'High sculpted cheekbones, subtle cybernetic neural link port behind right ear, determined sharp gaze',
        identityLock: true,
        referenceImages: [
          char1Ref,
          'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80'
        ],
        embedding: IdentityEngine.extractFaceEmbedding(char1Ref, 101),
        loraModel: 'aria_vance_pulid_v3.safetensors',
        loraWeight: 0.95,
        faceSimilarityThreshold: 0.88,
        version: 3,
        createdAt: Date.now() - 86400000 * 5,
        updatedAt: Date.now()
      },
      {
        id: 'char_kaelen_voss',
        name: 'Kaelen Voss',
        age: 32,
        gender: 'Male',
        ethnicity: 'Nordic Scandinavian',
        hairStyle: 'Short textured combat crop with faded sides',
        hairColor: 'Ash Brown with sun-bleached tips',
        eyeColor: 'Ice Steel Blue',
        defaultOutfit: 'Pilot exo-suit harness with armored magnetic gauntlets and high-collar thermal flight shirt',
        facialFeatures: 'Chiseled jawline, faint combat scar over left eyebrow, focused tactical expression',
        identityLock: true,
        referenceImages: [
          char2Ref
        ],
        embedding: IdentityEngine.extractFaceEmbedding(char2Ref, 202),
        loraModel: 'kaelen_voss_sdxl_v2.safetensors',
        loraWeight: 0.90,
        faceSimilarityThreshold: 0.86,
        version: 2,
        createdAt: Date.now() - 86400000 * 2,
        updatedAt: Date.now()
      }
    ];
  }

  // ==========================================
  // GALLERY & OUTPUT HISTORY
  // ==========================================

  public async getGallery(): Promise<OutputItem[]> {
    await this.ensureReady();
    if (!this.db) return this.getDefaultGallery();

    return new Promise((resolve) => {
      try {
        const tx = this.db!.transaction(STORE_GALLERY, 'readonly');
        const store = tx.objectStore(STORE_GALLERY);
        const req = store.getAll();
        req.onsuccess = () => {
          if (req.result && req.result.length > 0) {
            resolve(req.result.sort((a, b) => b.timestamp - a.timestamp));
          } else {
            const defaults = this.getDefaultGallery();
            this.saveGalleryBatch(defaults).then(() => resolve(defaults));
          }
        };
        req.onerror = () => resolve(this.getDefaultGallery());
      } catch (e) {
        resolve(this.getDefaultGallery());
      }
    });
  }

  public async saveOutput(item: OutputItem): Promise<void> {
    await this.ensureReady();
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db!.transaction(STORE_GALLERY, 'readwrite');
        const store = tx.objectStore(STORE_GALLERY);
        const req = store.put(item);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (e) {
        resolve();
      }
    });
  }

  public async deleteOutput(id: string): Promise<void> {
    await this.ensureReady();
    if (!this.db) return;
    return new Promise((resolve, reject) => {
      try {
        const tx = this.db!.transaction(STORE_GALLERY, 'readwrite');
        const store = tx.objectStore(STORE_GALLERY);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (e) {
        resolve();
      }
    });
  }

  private async saveGalleryBatch(items: OutputItem[]): Promise<void> {
    if (!this.db) return;
    try {
      const tx = this.db.transaction(STORE_GALLERY, 'readwrite');
      const store = tx.objectStore(STORE_GALLERY);
      items.forEach(i => store.put(i));
    } catch (e) {
      // Safe fallback
    }
  }

  public getDefaultGallery(): OutputItem[] {
    return [
      {
        id: 'out_1',
        characterId: 'char_aria_vance',
        characterName: 'Aria Vance',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1080&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
        model: 'FLUX.2 Max',
        prompt: 'Cinematic portrait of Aria Vance in rain-slicked Neo-Shibuya neon market, 85mm f/1.4 lens, realistic skin pores, reflective fiber optic accents',
        identitySimilarity: 0.982,
        passedIdentityLock: true,
        resolution: { width: 1024, height: 1792 },
        seed: 4892019,
        enhancersApplied: ['CodeFormer', 'SUPIR'],
        timestamp: Date.now() - 3600000 * 2
      },
      {
        id: 'out_2',
        characterId: 'char_kaelen_voss',
        characterName: 'Kaelen Voss',
        type: 'image',
        url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1080&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
        model: 'Seedream 5 Pro',
        prompt: 'Kaelen Voss inside mecha hangar gantry, dramatic volumetric rim light, realistic flight suit textures, dust particles in spotlight',
        identitySimilarity: 0.965,
        passedIdentityLock: true,
        resolution: { width: 1024, height: 1024 },
        seed: 1984021,
        enhancersApplied: ['ADetailer', '4x-UltraSharp'],
        timestamp: Date.now() - 3600000 * 6
      }
    ];
  }

  // ===================================================
  // POSTGRESQL & REDIS DUMP GENERATOR FOR CLOUD EXPORT
  // ===================================================

  public async exportPostgreSQLSchema(): Promise<string> {
    const characters = await this.getCharacters();
    const gallery = await this.getGallery();

    let sql = `-- =============================================================\n`;
    sql += `-- AETHERFORGE AI CHARACTER STUDIO - POSTGRESQL DDL & SEED SCRIPT\n`;
    sql += `-- Compatible with PostgreSQL 15+ & pgvector Extension\n`;
    sql += `-- =============================================================\n\n`;

    sql += `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\n`;
    sql += `CREATE EXTENSION IF NOT EXISTS "vector";\n\n`;

    sql += `CREATE TABLE IF NOT EXISTS character_profiles (\n`;
    sql += `  id VARCHAR(64) PRIMARY KEY,\n`;
    sql += `  name VARCHAR(128) NOT NULL,\n`;
    sql += `  age INT NOT NULL,\n`;
    sql += `  gender VARCHAR(32) NOT NULL,\n`;
    sql += `  ethnicity VARCHAR(64),\n`;
    sql += `  hair_style VARCHAR(128),\n`;
    sql += `  hair_color VARCHAR(64),\n`;
    sql += `  eye_color VARCHAR(64),\n`;
    sql += `  default_outfit TEXT,\n`;
    sql += `  facial_features TEXT,\n`;
    sql += `  identity_lock BOOLEAN DEFAULT TRUE,\n`;
    sql += `  lora_model VARCHAR(128),\n`;
    sql += `  lora_weight NUMERIC(4, 2) DEFAULT 1.00,\n`;
    sql += `  similarity_threshold NUMERIC(4, 2) DEFAULT 0.85,\n`;
    sql += `  embedding_vector vector(512),\n`;
    sql += `  reference_images TEXT[],\n`;
    sql += `  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),\n`;
    sql += `  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()\n`;
    sql += `);\n\n`;

    sql += `CREATE TABLE IF NOT EXISTS generation_gallery (\n`;
    sql += `  id VARCHAR(64) PRIMARY KEY,\n`;
    sql += `  character_id VARCHAR(64) REFERENCES character_profiles(id) ON DELETE CASCADE,\n`;
    sql += `  media_type VARCHAR(16) NOT NULL,\n`;
    sql += `  storage_url TEXT NOT NULL,\n`;
    sql += `  model_name VARCHAR(64) NOT NULL,\n`;
    sql += `  prompt TEXT NOT NULL,\n`;
    sql += `  similarity_score NUMERIC(5, 4),\n`;
    sql += `  passed_lock BOOLEAN,\n`;
    sql += `  width INT,\n`;
    sql += `  height INT,\n`;
    sql += `  seed BIGINT,\n`;
    sql += `  enhancers_applied TEXT[],\n`;
    sql += `  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()\n`;
    sql += `);\n\n`;

    sql += `-- INSERT CHARACTERS --\n`;
    characters.forEach((c) => {
      const vecStr = `[${c.embedding.vector.slice(0, 8).join(',')}, ... 512 dimensions]`;
      sql += `INSERT INTO character_profiles (id, name, age, gender, ethnicity, hair_style, hair_color, eye_color, default_outfit, facial_features, identity_lock, lora_model, lora_weight, similarity_threshold)\n`;
      sql += `VALUES ('${c.id}', '${c.name.replace(/'/g, "''")}', ${c.age}, '${c.gender}', '${c.ethnicity}', '${c.hairStyle}', '${c.hairColor}', '${c.eyeColor}', '${c.defaultOutfit.replace(/'/g, "''")}', '${c.facialFeatures.replace(/'/g, "''")}', ${c.identityLock}, '${c.loraModel}', ${c.loraWeight}, ${c.faceSimilarityThreshold})\n`;
      sql += `ON CONFLICT (id) DO UPDATE SET updated_at = NOW();\n`;
    });

    return sql;
  }

  public async exportRedisQueueCommands(): Promise<string> {
    const characters = await this.getCharacters();
    let redisCmds = `# ====================================================\n`;
    redisCmds += `# AETHERFORGE REDIS QUEUE STREAM DEFINITIONS\n`;
    redisCmds += `# Compatible with Redis 7.0+ Streams (XADD / XREADGROUP)\n`;
    redisCmds += `# ====================================================\n\n`;

    characters.forEach((c, idx) => {
      redisCmds += `XADD comfyui:generation:queue * character_id "${c.id}" priority "${c.identityLock ? '10' : '5'}" payload "{\\"model\\":\\"FLUX.2 Max\\",\\"seed\\":${100000 + idx}}"\\n`;
    });

    return redisCmds;
  }
}

export const characterStorage = new CharacterStorageEngine();
