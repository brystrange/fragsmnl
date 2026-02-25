const plugin = require('tailwindcss/plugin');

module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontSize: {
        // Overrides Tailwind's default text-xs (12px) to 14px
        //'xs': '14px',
      },
      colors: {
        // Primary accent color based on #462C50
        accent: {
          50: '#FFFFFF',
          100: '#DCDCEF',
          200: '#BABADE',
          300: '#9797CE',
          400: '#7474BE',
          500: '#5252AD',
          600: '#41418B',
          700: '#313168',
          800: '#212145',
          900: '#101023',
          950: '#0B0B18',
        }
      }
    }
  },
  plugins: [
    plugin(function ({ addComponents, theme }) {
      addComponents({
        // Primary accent button — matches the design in the reference image
        '.btn-accent': {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          paddingTop: '0.5rem',
          paddingBottom: '0.5rem',
          paddingLeft: '1.25rem',
          paddingRight: '1.25rem',
          borderRadius: '7px',
          fontWeight: '600',
          fontSize: '0.875rem',
          color: `${theme('colors.accent.50')}`,
          background: `linear-gradient(140deg, ${theme('colors.accent.900')} 0%, ${theme('colors.accent.900')} 50%, ${theme('colors.accent.900')} 100%)`,
          border: `1px solid ${theme('colors.accent.300')}`,
          boxShadow: '0 0 0 0 #666666, 0 0 0 #666666',
          transition: 'all 0.2s ease',
          cursor: 'pointer',
          '&:hover': {
            background: `linear-gradient(140deg, ${theme('colors.accent.800')} 0%, ${theme('colors.accent.800')} 50%, ${theme('colors.accent.800')} 100%)`,
            border: `1px solid ${theme('colors.accent.800')}`,
            boxShadow: '0 0 0 0 #666666, 0 0 0 #666666',
            transform: 'translateY(0px)',
          },
          '&:active': {
            transform: 'translateY(0)',
            boxShadow: '0 0 0 0 #666666, 0 0 0 #666666',
          },
          '&:disabled': {
            opacity: '0.5',
            cursor: 'not-allowed',
            transform: 'none',
          },
        },

        // Danger/destructive variant — keeps red for delete/cancel actions
        '.btn-danger': {
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          paddingTop: '0.5rem',
          paddingBottom: '0.5rem',
          paddingLeft: '1.25rem',
          paddingRight: '1.25rem',
          borderRadius: '9999px',
          fontWeight: '600',
          fontSize: '0.875rem',
          color: '#ffffff',
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          border: '1px solid #f87171',
          boxShadow: '0 0 0 1px rgba(248, 113, 113, 0.2), 0 2px 8px rgba(220, 38, 38, 0.3)',
          transition: 'all 0.2s ease',
          cursor: 'pointer',
          '&:hover': {
            background: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)',
            boxShadow: '0 0 0 1px rgba(248, 113, 113, 0.4), 0 4px 12px rgba(220, 38, 38, 0.5)',
            transform: 'translateY(-1px)',
          },
          '&:disabled': {
            opacity: '0.5',
            cursor: 'not-allowed',
            transform: 'none',
          },
        },
      });
    }),
  ],
}