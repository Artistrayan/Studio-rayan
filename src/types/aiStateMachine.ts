/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AIStateType = 'patrol' | 'chase' | 'attack' | 'flee' | 'idle' | 'search';

export interface AIStateNode {
  id: string;
  name: string;
  type: AIStateType;
  x: number;
  y: number;
  speed: number;
  visionRadius: number;
  attackRange: number;
  color: string;
  actionText: string;
}

export interface AITransition {
  id: string;
  fromStateId: string;
  toStateId: string;
  condition: 'player_spotted' | 'player_in_range' | 'player_escaped' | 'health_low' | 'timeout';
  conditionValue?: number;
  label: string;
}

export interface AIEnemyInstance {
  id: string;
  name: string;
  x: number;
  y: number;
  currentStateId: string;
  health: number;
  maxHealth: number;
  patrolOriginX: number;
  patrolRange: number;
  direction: 1 | -1;
  alertLevel: number; // 0 to 100
  targetDistance: number;
  lastAction: string;
}

export const DEFAULT_AI_STATES: AIStateNode[] = [
  {
    id: 'state_patrol',
    name: 'گشت‌زنی (Patrol)',
    type: 'patrol',
    x: 60,
    y: 120,
    speed: 2.2,
    visionRadius: 180,
    attackRange: 40,
    color: '#06b6d4',
    actionText: 'حرکت مداوم بین ایستگاه‌ها و اسکن محیط'
  },
  {
    id: 'state_chase',
    name: 'تعقیب بازیکن (Chase)',
    type: 'chase',
    x: 320,
    y: 70,
    speed: 4.8,
    visionRadius: 260,
    attackRange: 50,
    color: '#f59e0b',
    actionText: 'دویدن با شتاب به سمت موقعیت بازیکن'
  },
  {
    id: 'state_attack',
    name: 'حمله نزدیک (Attack)',
    type: 'attack',
    x: 580,
    y: 120,
    speed: 1.0,
    visionRadius: 100,
    attackRange: 45,
    color: '#ef4444',
    actionText: 'شلیک گلوله یا ضربه شمشیر در شعاع تماس'
  },
  {
    id: 'state_flee',
    name: 'فرار و عقب‌نشینی (Flee)',
    type: 'flee',
    x: 320,
    y: 280,
    speed: 5.5,
    visionRadius: 300,
    attackRange: 0,
    color: '#a855f7',
    actionText: 'فرار در جهت مخالف بازیکن هنگام کم بودن جان'
  }
];

export const DEFAULT_AI_TRANSITIONS: AITransition[] = [
  {
    id: 'trans_1',
    fromStateId: 'state_patrol',
    toStateId: 'state_chase',
    condition: 'player_spotted',
    label: 'مشاهده بازیکن در شعاع دید (فاصله < ۱۸۰)'
  },
  {
    id: 'trans_2',
    fromStateId: 'state_chase',
    toStateId: 'state_attack',
    condition: 'player_in_range',
    label: 'رسیدن به فاصله ضربه (فاصله < ۴۵)'
  },
  {
    id: 'trans_3',
    fromStateId: 'state_attack',
    toStateId: 'state_chase',
    condition: 'player_escaped',
    label: 'دور شدن بازیکن از شعاع حمله'
  },
  {
    id: 'trans_4',
    fromStateId: 'state_chase',
    toStateId: 'state_patrol',
    condition: 'player_escaped',
    conditionValue: 260,
    label: 'گم کردن بازیکن (فاصله > ۲۶۰)'
  },
  {
    id: 'trans_5',
    fromStateId: 'state_chase',
    toStateId: 'state_flee',
    condition: 'health_low',
    conditionValue: 25,
    label: 'کاهش جان دشمن به زیر ۲۵٪'
  }
];
