/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TourStep {
  id: number;
  title: string;
  titleFa: string;
  description: string;
  descriptionFa: string;
  targetWorkspace: string;
  badge: string;
}

export const ONBOARDING_TOUR_STEPS: TourStep[] = [
  {
    id: 1,
    title: 'Welcome to AetherForge Studio',
    titleFa: 'به اتراستودیو خوش آمدید',
    description: 'AetherForge Studio is a complete offline Game Engine and IDE with 2D/3D physics, scripting, and mobile/desktop packaging.',
    descriptionFa: 'موتور بازی‌سازی اتراستودیو شامل محیط سه‌بعدی، فیزیک، اسکریپت‌نویسی و خروجی اندروید، دسکتاپ و وب می‌باشد.',
    targetWorkspace: 'game',
    badge: 'Overview'
  },
  {
    id: 2,
    title: '2D & 3D Viewports',
    titleFa: 'استودیو دوبعدی و سه‌بعدی',
    description: 'Switch between 2D Side-Scroller, Tilemap Editor, and 3D Sandbox Studio to sculpt terrains, rig characters, and place procedural mechs.',
    descriptionFa: 'جابجایی بین استودیو ۲ بعدی و ۳ بعدی برای چینش صحنه، مدل‌سازی، متریال‌ها و نورپردازی.',
    targetWorkspace: '3d_studio',
    badge: 'Design'
  },
  {
    id: 3,
    title: 'Polyglot Code Editor',
    titleFa: 'ویرایشگر کد با چند زبان',
    description: 'Write TypeScript, Python, Lua, or GLSL ES shaders with live sandboxed AST execution, line breakpoints, and infinite-loop watchdogs.',
    descriptionFa: 'برنامه‌نویسی با تایپ‌اسکریپت، پایتون، لئوآ و GLSL همراه با اجرای امن در بستر ایزوله و نقطه‌شکست.',
    targetWorkspace: 'code',
    badge: 'Scripting'
  },
  {
    id: 4,
    title: 'Asset Library & Asset Generators',
    titleFa: 'کتابخانه دارایی‌ها و تولیدکننده پیکسل‌ارائ',
    description: 'Access procedural 3D models (mechs, jets, tanks), audio synthesizer, particle designer, and tilemap generator.',
    descriptionFa: 'دسترسی به کتابخانه مدل‌های ۳ بعدی، سینتی‌سایزر صوتی، ذرات و انیماتور فریم‌به‌فریم.',
    targetWorkspace: 'assets',
    badge: 'Assets'
  },
  {
    id: 5,
    title: 'Packaging & Release Suite',
    titleFa: 'سامانه انتشار و بسته‌بندی',
    description: 'Export standalone offline single-file Web HTML5, Android APK Capacitor, iOS Xcode, and Desktop Electron apps with signed JWT keys.',
    descriptionFa: 'خروجی‌گیری مستقل وب HTML5، پروژه اندروید APK، iOS و دسکتاپ به همراه کلیدهای امنیتی HMAC-SHA256.',
    targetWorkspace: 'export',
    badge: 'Export'
  }
];
