import React, { createContext, useContext } from 'react'

export const colors = {
  background: '#202a37',
  cardBackground: '#323a45',
  primary: '#0071bc',
  primaryDark: '#005a94',
  alert: '#e31c3d',
  warning: '#fdb81e',
  success: '#2e8540',
  textPrimary: '#ffffff',
  textSecondary: '#aeb0b5',
  online: '#2e8540',
  offline: '#e31c3d',
  degraded: '#fdb81e',
  severityHigh: '#e31c3d',
  severityModerate: '#fdb81e',
  severityLow: '#0071bc',
  severityCleared: '#2e8540',
}

export const typography = {
  display1: {
    fontSize: '48px',
    fontWeight: 300,
    lineHeight: 1.2,
  },
  headline1: {
    fontSize: '24px',
    fontWeight: 700,
    lineHeight: 1.3,
  },
  headline2: {
    fontSize: '18px',
    fontWeight: 700,
    lineHeight: 1.4,
  },
  body1: {
    fontSize: '16px',
    fontWeight: 400,
    lineHeight: 1.5,
  },
  body2: {
    fontSize: '14px',
    fontWeight: 400,
    lineHeight: 1.5,
  },
  label: {
    fontSize: '12px',
    fontWeight: 500,
    lineHeight: 1.5,
  },
}

interface ThemeContextType {
  colors: typeof colors
  typography: typeof typography
}

const ThemeContext = createContext<ThemeContextType>({ colors, typography })

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ThemeContext.Provider value={{ colors, typography }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)

