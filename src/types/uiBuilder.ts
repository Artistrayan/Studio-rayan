/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UIComponent {
  id: string;
  type: 'button' | 'input' | 'card' | 'badge' | 'table' | 'chart' | 'navbar' | 'text' | 'toggle';
  label: string;
  placeholder?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  x: number;
  y: number;
  w: number;
  h: number;
  color?: string;
  textColor?: string;
  fontSize?: number;
  contentData?: any;
  dbAction?: 'insert_user' | 'load_items' | 'increase_score' | 'refresh_stats';
}

export interface UIScreen {
  id: string;
  name: string;
  components: UIComponent[];
}

export function createInitialScreen(): UIScreen {
  return {
    id: 'screen_dashboard',
    name: 'داشبورد کاربری (User Dashboard)',
    components: [
      {
        id: 'comp_nav',
        type: 'navbar',
        label: 'سامانه مدیریت اثر‌فورج | AetherForge Dashboard',
        x: 16,
        y: 16,
        w: 480,
        h: 46,
        color: '#1e293b',
        textColor: '#38bdf8'
      },
      {
        id: 'comp_card1',
        type: 'card',
        label: 'آمار فروش و بازیکنان فعال: ۱۲,۴۵۰ نفر',
        x: 16,
        y: 76,
        w: 232,
        h: 110,
        color: '#0f172a',
        textColor: '#10b981'
      },
      {
        id: 'comp_card2',
        type: 'card',
        label: 'درآمد ماهیانه کل: $۴۸,۲۰۰ دلار',
        x: 264,
        y: 76,
        w: 232,
        h: 110,
        color: '#0f172a',
        textColor: '#f59e0b'
      },
      {
        id: 'comp_chart',
        type: 'chart',
        label: 'نمودار رشد هفتگی کاربران (Weekly Growth Analytics)',
        x: 16,
        y: 200,
        w: 480,
        h: 140,
        color: '#1e293b',
        contentData: [35, 52, 48, 70, 85, 92, 110]
      },
      {
        id: 'comp_input',
        type: 'input',
        label: 'جستجوی کاربر یا محصول...',
        placeholder: 'جستجوی شناسه...',
        x: 16,
        y: 355,
        w: 320,
        h: 40,
        color: '#1e293b'
      },
      {
        id: 'comp_btn',
        type: 'button',
        label: 'افزودن کاربر جدید (+)',
        variant: 'primary',
        x: 350,
        y: 355,
        w: 146,
        h: 40,
        color: '#0284c7',
        textColor: '#ffffff'
      }
    ]
  };
}
