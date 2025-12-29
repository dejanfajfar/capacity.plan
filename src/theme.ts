import { createTheme, MantineColorsTuple } from '@mantine/core';

/**
 * One Dark Theme - Inspired by Atom/VS Code One Dark
 * Dark mode with syntax-highlighting inspired colors
 */

// One Dark color palettes (10 shades each, interpolated)
const oneDarkRed: MantineColorsTuple = [
  '#fae5e7', // 0 - lightest
  '#f0b3b8',
  '#e78089',
  '#dd4e5a',
  '#d41c2b',
  '#e06c75', // 5 - base color
  '#ca616a',
  '#b3565e',
  '#9d4b52',
  '#864046', // 9 - darkest
];

const oneDarkOrange: MantineColorsTuple = [
  '#f9ede5',
  '#efd0b3',
  '#e5b381',
  '#db964f',
  '#d1791d',
  '#d19a66', // 5 - base
  '#bc895d',
  '#a77854',
  '#92674b',
  '#7d5642',
];

const oneDarkYellow: MantineColorsTuple = [
  '#faf6e7',
  '#f2e8b3',
  '#eada80',
  '#e2cc4d',
  '#dabe1a',
  '#e5c07b', // 5 - base
  '#ceac6e',
  '#b79861',
  '#a08454',
  '#897047',
];

const oneDarkGreen: MantineColorsTuple = [
  '#edf6e7',
  '#cfe8b3',
  '#b1da80',
  '#93cc4d',
  '#75be1a',
  '#98c379', // 5 - base
  '#89af6d',
  '#7a9b61',
  '#6b8755',
  '#5c7349',
];

const oneDarkCyan: MantineColorsTuple = [
  '#e5f5f7',
  '#b3e2e8',
  '#80ced9',
  '#4ebaca',
  '#1ca6bb',
  '#56b6c2', // 5 - base
  '#4da4af',
  '#44929c',
  '#3b8089',
  '#326e76',
];

const oneDarkBlue: MantineColorsTuple = [
  '#e8f4fb',
  '#b8def6',
  '#88c8f1',
  '#58b2ec',
  '#289ce7',
  '#61afef', // 5 - base (primary color)
  '#579ed7',
  '#4d8dbf',
  '#437ca7',
  '#396b8f',
];

const oneDarkPurple: MantineColorsTuple = [
  '#f7ecf9',
  '#e7c3ed',
  '#d79ae1',
  '#c771d5',
  '#b748c9',
  '#c678dd', // 5 - base
  '#b26cc7',
  '#9e60b1',
  '#8a549b',
  '#764885',
];

const oneDarkDark: MantineColorsTuple = [
  '#abb2bf', // 0 - text primary
  '#828997', // 1 - dimmed
  '#5c6370', // 2 - secondary
  '#3e4451', // 3 - border
  '#2c313a', // 4 - hover
  '#282c34', // 5 - bg (base)
  '#21252b', // 6 - surface
  '#1c1f26', // 7 - deep
  '#171a1f', // 8 - deeper
  '#0f1116', // 9 - deepest
];

/**
 * Solarized Light Theme
 * Light mode with Solarized color palette
 */

const solarizedRed: MantineColorsTuple = [
  '#fdf4f4',
  '#f9d9d8',
  '#f5bfbc',
  '#f1a4a0',
  '#ed8984',
  '#dc322f', // 5 - base
  '#c62d2a',
  '#b02825',
  '#9a2320',
  '#841e1b',
];

const solarizedOrange: MantineColorsTuple = [
  '#fdf2ed',
  '#f9d9c8',
  '#f5c0a3',
  '#f1a77e',
  '#ed8e59',
  '#cb4b16', // 5 - base
  '#b74414',
  '#a33d12',
  '#8f3610',
  '#7b2f0e',
];

const solarizedYellow: MantineColorsTuple = [
  '#fcf8ed',
  '#f7edc7',
  '#f2e2a1',
  '#edd77b',
  '#e8cc55',
  '#b58900', // 5 - base
  '#a37b00',
  '#916d00',
  '#7f5f00',
  '#6d5100',
];

const solarizedGreen: MantineColorsTuple = [
  '#f4f7ed',
  '#dfeac7',
  '#cadda1',
  '#b5d07b',
  '#a0c355',
  '#859900', // 5 - base
  '#788900',
  '#6b7900',
  '#5e6900',
  '#515900',
];

const solarizedCyan: MantineColorsTuple = [
  '#ecf8f7',
  '#c5ebe8',
  '#9eddd9',
  '#77d0ca',
  '#50c3bb',
  '#2aa198', // 5 - base
  '#269189',
  '#22817a',
  '#1e716b',
  '#1a615c',
];

const solarizedBlue: MantineColorsTuple = [
  '#edf5fb',
  '#c8e0f4',
  '#a3cbed',
  '#7eb6e6',
  '#59a1df',
  '#268bd2', // 5 - base (primary)
  '#227dbd',
  '#1e6fa8',
  '#1a6193',
  '#16537e',
];

const solarizedMagenta: MantineColorsTuple = [
  '#fbeef7',
  '#f4cee8',
  '#edaed9',
  '#e68eca',
  '#df6ebb',
  '#d33682', // 5 - base
  '#be3175',
  '#a92c68',
  '#94275b',
  '#7f224e',
];

const solarizedViolet: MantineColorsTuple = [
  '#efeff9',
  '#d0d1ed',
  '#b1b3e1',
  '#9295d5',
  '#7377c9',
  '#6c71c4', // 5 - base
  '#6166b1',
  '#565b9e',
  '#4b508b',
  '#404578',
];

const solarizedDark: MantineColorsTuple = [
  '#073642', // 0 - text primary (base02) - Used by Mantine for text in light mode
  '#002b36', // 1 - text emphasis (base03)
  '#586e75', // 2 - text secondary (base01)
  '#657b83', // 3 - text tertiary (base00)
  '#839496', // 4 - borders (base0)
  '#93a1a1', // 5 - dimmed text (base1)
  '#eee8d5', // 6 - surface (base2)
  '#fdf6e3', // 7 - background (base3)
  '#fffef8', // 8 - lighter variant
  '#fffff0', // 9 - lightest variant
];

/**
 * One Dark Theme Configuration
 */
export const oneDarkTheme = createTheme({
  primaryColor: 'blue',
  colors: {
    red: oneDarkRed,
    orange: oneDarkOrange,
    yellow: oneDarkYellow,
    green: oneDarkGreen,
    cyan: oneDarkCyan,
    blue: oneDarkBlue,
    purple: oneDarkPurple,
    dark: oneDarkDark,
  },
  
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontFamilyMonospace: "'JetBrains Mono', 'Consolas', 'Monaco', 'Courier New', monospace",
  
  headings: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontWeight: '700',
  },
  
  components: {
    AppShell: {
      styles: {
        header: {
          backgroundColor: 'var(--mantine-color-dark-6)',
          borderBottom: '1px solid var(--mantine-color-dark-3)',
        },
        navbar: {
          backgroundColor: 'var(--mantine-color-dark-6)',
          borderRight: '1px solid var(--mantine-color-dark-3)',
        },
      },
    },
    
    Paper: {
      defaultProps: {
        shadow: 'sm',
      },
      styles: {
        root: {
          backgroundColor: 'var(--mantine-color-dark-6)',
          borderColor: 'var(--mantine-color-dark-3)',
        },
      },
    },
    
    Card: {
      defaultProps: {
        shadow: 'sm',
      },
      styles: {
        root: {
          backgroundColor: 'var(--mantine-color-dark-6)',
        },
      },
    },
    
    Table: {
      styles: {
        th: {
          fontFamily: "'JetBrains Mono', monospace",
          backgroundColor: 'var(--mantine-color-dark-7)',
          fontWeight: 600,
        },
        td: {
          fontFamily: "'JetBrains Mono', monospace",
        },
      },
    },
    
    Button: {
      styles: {
        root: {
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 500,
        },
      },
    },
    
    TextInput: {
      styles: {
        input: {
          fontFamily: "'JetBrains Mono', monospace",
        },
      },
    },
    
    NumberInput: {
      styles: {
        input: {
          fontFamily: "'JetBrains Mono', monospace",
          fontVariantNumeric: 'tabular-nums',
        },
      },
    },
    
    Select: {
      styles: {
        input: {
          fontFamily: "'JetBrains Mono', monospace",
        },
      },
    },
    
    Badge: {
      styles: {
        root: {
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 500,
        },
      },
    },
    
    ActionIcon: {
      styles: {
        root: {
          '&:hover': {
            backgroundColor: 'var(--mantine-color-dark-4)',
          },
        },
      },
    },
  },
});

/**
 * Solarized Light Theme Configuration
 */
export const solarizedLightTheme = createTheme({
  primaryColor: 'blue',
  white: '#fdf6e3',    // Solarized base3 (background)
  black: '#073642',    // Solarized base02 (dark text)
  
  colors: {
    red: solarizedRed,
    orange: solarizedOrange,
    yellow: solarizedYellow,
    green: solarizedGreen,
    cyan: solarizedCyan,
    blue: solarizedBlue,
    magenta: solarizedMagenta,
    violet: solarizedViolet,
    dark: solarizedDark,
  },
  
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontFamilyMonospace: "'JetBrains Mono', 'Consolas', 'Monaco', 'Courier New', monospace",
  
  headings: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontWeight: '700',
  },
  
  components: {
    AppShell: {
      styles: {
        header: {
          backgroundColor: '#eee8d5', // Solarized base2 (light surface)
          borderBottom: '1px solid #93a1a1', // Solarized base1 (subtle border)
        },
        navbar: {
          backgroundColor: '#eee8d5', // Solarized base2 (light surface)
          borderRight: '1px solid #93a1a1', // Solarized base1 (subtle border)
        },
        main: {
          backgroundColor: '#fdf6e3', // Solarized base3 (lightest background)
        },
      },
    },
    
    Text: {
      styles: {
        root: {
          color: '#657b83', // Solarized base00 (primary text)
          
          // Handle dimmed variant
          '&[data-dimmed]': {
            color: '#93a1a1 !important', // Solarized base1 (dimmed)
          },
        },
      },
    },
    
    Title: {
      styles: {
        root: {
          color: '#073642', // Solarized base02 (headers)
        },
      },
    },
    
    Paper: {
      defaultProps: {
        shadow: 'sm',
      },
      styles: {
        root: {
          backgroundColor: '#ffffff',
          borderColor: 'var(--mantine-color-dark-2)',
        },
      },
    },
    
    Card: {
      defaultProps: {
        shadow: 'sm',
      },
      styles: {
        root: {
          backgroundColor: '#ffffff',
        },
      },
    },
    
    Table: {
      styles: {
        th: {
          fontFamily: "'JetBrains Mono', monospace",
          backgroundColor: '#eee8d5', // Solarized base2 (light surface)
          fontWeight: 600,
          color: '#073642', // Dark text for headers
        },
        td: {
          fontFamily: "'JetBrains Mono', monospace",
          color: '#657b83', // Primary text color for cells
        },
      },
    },
    
    Button: {
      styles: {
        root: {
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 500,
        },
      },
    },
    
    TextInput: {
      styles: {
        input: {
          fontFamily: "'JetBrains Mono', monospace",
          color: '#073642', // Dark text in inputs
          backgroundColor: '#ffffff', // White input background
        },
        label: {
          color: '#657b83', // Label text
        },
      },
    },
    
    NumberInput: {
      styles: {
        input: {
          fontFamily: "'JetBrains Mono', monospace",
          fontVariantNumeric: 'tabular-nums',
          color: '#073642',
          backgroundColor: '#ffffff',
        },
        label: {
          color: '#657b83',
        },
      },
    },
    
    Select: {
      styles: {
        input: {
          fontFamily: "'JetBrains Mono', monospace",
          color: '#073642',
          backgroundColor: '#ffffff',
        },
        label: {
          color: '#657b83',
        },
      },
    },
    
    Badge: {
      styles: {
        root: {
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 500,
        },
      },
    },
    
    ActionIcon: {
      styles: {
        root: {
          '&:hover': {
            backgroundColor: '#93a1a1', // Solarized base1 (subtle hover)
          },
        },
      },
    },
    
    Alert: {
      styles: {
        message: {
          color: '#657b83', // Primary text
        },
        title: {
          color: '#073642', // Header text
        },
      },
    },
    
    Notification: {
      styles: {
        description: {
          color: '#657b83', // Primary text
        },
        title: {
          color: '#073642', // Header text
        },
      },
    },
    
    NavLink: {
      styles: {
        label: {
          color: '#657b83', // Primary text
        },
        root: {
          '&:hover': {
            backgroundColor: '#93a1a1', // Solarized base1 (subtle highlight)
          },
          '&[data-active]': {
            backgroundColor: '#839496', // Solarized base0 (active state)
            color: '#073642', // Dark text on medium background
          },
        },
      },
    },
  },
});
