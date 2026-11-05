/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CategorizedAsset {
  id: string;
  nameFa: string;
  nameEn: string;
  category: 'characters' | 'vehicles' | 'architecture' | 'nature' | 'props' | 'weapons';
  icon: string;
  primitiveType: string;
  descriptionFa: string;
}

export const CATEGORIZED_3D_ASSETS: CategorizedAsset[] = [
  // Characters & Mechs
  {
    id: 'mech',
    nameFa: 'ربات جنگنده (Mech Bot)',
    nameEn: 'Combat Mech Bot',
    category: 'characters',
    icon: '🤖',
    primitiveType: 'mech',
    descriptionFa: 'ربات هوشمند با مفصل‌بندی شانه، پلاتفرم پاها و ویزور شب‌تاب'
  },
  {
    id: 'throne',
    nameFa: 'تخت ریاست (Throne)',
    nameEn: 'Presidential Throne',
    category: 'characters',
    icon: '👑',
    primitiveType: 'throne',
    descriptionFa: 'تخت پادشاهی و طلایی با سکوی سنگی و مخمل قرمز'
  },

  // Vehicles & Sci-Fi
  {
    id: 'jet',
    nameFa: 'جنگنده مافوق صوت (Jet Fighter)',
    nameEn: 'Supersonic Jet Fighter',
    category: 'vehicles',
    icon: '✈️',
    primitiveType: 'jet',
    descriptionFa: 'جت جنگنده با بال‌های دلتا، کابین شیشه‌ای و اگزوز دوگانه'
  },
  {
    id: 'tank',
    nameFa: 'تانک زرهی (Battle Tank)',
    nameEn: 'Armored Battle Tank',
    category: 'vehicles',
    icon: '🛡️',
    primitiveType: 'tank',
    descriptionFa: 'تانک جنگی با چرخ‌های شنی، برجک چرخشی و توپ سنگین'
  },
  {
    id: 'supercar',
    nameFa: 'خودروی سوپراسپرت (Supercar)',
    nameEn: 'Sports Supercar',
    category: 'vehicles',
    icon: '🏎️',
    primitiveType: 'supercar',
    descriptionFa: 'ماشین اسپرت با شاسی PBR، اسپویلر عقب و ۴ چرخ آلومینیومی'
  },
  {
    id: 'satellite',
    nameFa: 'ماهواره مداری (Satellite)',
    nameEn: 'Orbital Satellite',
    category: 'vehicles',
    icon: '🛰️',
    primitiveType: 'satellite',
    descriptionFa: 'ماهواره فضایی با پنل‌های خورشیدی آبی و دیش مخابراتی'
  },

  // Architecture & World
  {
    id: 'parliament',
    nameFa: 'کاخ پارلمان و پایتخت (Capitol)',
    nameEn: 'Capitol Parliament Building',
    category: 'architecture',
    icon: '🏛️',
    primitiveType: 'parliament',
    descriptionFa: 'ساختمان کلاسیک با ستون‌های رومی، گنبد آبی و منار طلایی'
  },
  {
    id: 'skyscraper',
    nameFa: 'برج آسمان‌خراش (Skyscraper)',
    nameEn: 'Metropolis Skyscraper',
    category: 'architecture',
    icon: '🏙️',
    primitiveType: 'skyscraper',
    descriptionFa: 'برج شیشه‌ای چندطبقه با آنتن مخابراتی و چراغ قرمز هشدار'
  },

  // Environment & Nature
  {
    id: 'terrain',
    nameFa: 'زمین کوهستانی (Terrain Map)',
    nameEn: 'Mountainous Terrain',
    category: 'nature',
    icon: '⛰️',
    primitiveType: 'terrain',
    descriptionFa: 'نقشه پستی و بلندی‌های طبیعی با ۴۸×۴۸ شبکه نرم'
  },

  // Primitives
  {
    id: 'cube',
    nameFa: 'مکعب استاندارد (Cube)',
    nameEn: 'Standard Cube',
    category: 'props',
    icon: '📦',
    primitiveType: 'cube',
    descriptionFa: 'بوم مکعبی اولیه مناسب برای مجسمه‌سازی و تست متریال'
  },
  {
    id: 'sphere',
    nameFa: 'کره (Sphere)',
    nameEn: 'Sphere Geometry',
    category: 'props',
    icon: '🔮',
    primitiveType: 'sphere',
    descriptionFa: 'کره ۴۸ سطحی برای انحناها و مدلسازی‌های مدور'
  },
  {
    id: 'cylinder',
    nameFa: 'استوانه (Cylinder)',
    nameEn: 'Cylinder Geometry',
    category: 'props',
    icon: '🛢️',
    primitiveType: 'cylinder',
    descriptionFa: 'استوانه ۳۲ ضلعی برای ستون‌ها و لوله‌ها'
  },
  {
    id: 'torus',
    nameFa: 'حلقه (Torus / Donut)',
    nameEn: 'Torus Ring',
    category: 'props',
    icon: '⭕',
    primitiveType: 'torus',
    descriptionFa: 'حلقه سه‌بعدی برای ساخت حلقه‌های انرژی و تایرها'
  }
];
