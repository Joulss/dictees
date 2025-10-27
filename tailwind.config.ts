import type { Config } from 'tailwindcss';

export default {
  darkMode : ['class'], // we control theme with <html class="dark">
  content  : [
    './index.html',
    './src/**/*.{vue,ts,tsx}',
    './components/**/*.{vue,ts,tsx}',
    './pages/**/*.{vue,ts,tsx}'
  ],
  theme: {
    // We rely on @theme tokens in CSS; keep here minimal customizations
    extend: {
      borderRadius: {
        sm : 'var(--radius-sm)',
        md : 'var(--radius-md)',
        lg : 'var(--radius-lg)'
      },
      colors: {
        background         : 'var(--color-background)',
        foreground         : 'var(--color-foreground)',
        surface            : 'var(--color-surface)',
        muted              : 'var(--color-muted)',
        'muted-foreground' : 'var(--color-muted-foreground)',
        border             : 'var(--color-border)',
        ring               : 'var(--color-ring)',

        primary              : 'var(--color-primary)',
        'primary-foreground' : 'var(--color-primary-foreground)',
        success              : 'var(--color-success)',
        warning              : 'var(--color-warning)',
        danger               : 'var(--color-danger)'
      }
    }
  },
  plugins: []
} satisfies Config;
