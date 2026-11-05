/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DBColumn {
  id: string;
  name: string;
  type: 'INTEGER' | 'TEXT' | 'REAL' | 'BOOLEAN';
  isPrimary?: boolean;
}

export interface DBTable {
  id: string;
  name: string;
  columns: DBColumn[];
  rows: Record<string, any>[];
}

export interface LocalDatabase {
  tables: DBTable[];
}

export function createInitialDatabase(): LocalDatabase {
  return {
    tables: [
      {
        id: 'tbl_users',
        name: 'users (کاربران)',
        columns: [
          { id: 'c1', name: 'id', type: 'INTEGER', isPrimary: true },
          { id: 'c2', name: 'username', type: 'TEXT' },
          { id: 'c3', name: 'email', type: 'TEXT' },
          { id: 'c4', name: 'score', type: 'INTEGER' },
          { id: 'c5', name: 'is_premium', type: 'BOOLEAN' }
        ],
        rows: [
          { id: 1, username: 'sohrab_g', email: 'sohrab@domain.com', score: 1420, is_premium: true },
          { id: 2, username: 'aria_dev', email: 'aria@domain.com', score: 890, is_premium: false },
          { id: 3, username: 'mina_art', email: 'mina@domain.com', score: 2310, is_premium: true },
          { id: 4, username: 'gamer_x', email: 'gamer@domain.com', score: 540, is_premium: false }
        ]
      },
      {
        id: 'tbl_items',
        name: 'inventory (کالاهای بازی)',
        columns: [
          { id: 'ci1', name: 'item_id', type: 'INTEGER', isPrimary: true },
          { id: 'ci2', name: 'name', type: 'TEXT' },
          { id: 'ci3', name: 'price_gold', type: 'INTEGER' },
          { id: 'ci4', name: 'rarity', type: 'TEXT' }
        ],
        rows: [
          { item_id: 101, name: 'شمشیر اژدها (Dragon Sword)', price_gold: 500, rarity: 'Legendary' },
          { item_id: 102, name: 'سپر نقره‌ای (Silver Shield)', price_gold: 240, rarity: 'Rare' },
          { item_id: 103, name: 'اکسیر حیات (Health Elixir)', price_gold: 45, rarity: 'Common' },
          { item_id: 104, name: 'حلقه تلپورت (Teleport Ring)', price_gold: 850, rarity: 'Epic' }
        ]
      }
    ]
  };
}
