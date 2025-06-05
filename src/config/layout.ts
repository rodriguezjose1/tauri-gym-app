// Layout configuration for consistent styling across all pages

// Main layout constant - Change this value to adjust all pages at once
const MAX_WIDTH = '1600px'; // Optimized for 24" monitors (1920px width)

export const layoutConfig = {
  // Main layout settings
  MAX_WIDTH,
  
  // Container settings
  container: {
    maxWidth: MAX_WIDTH,
    margin: '0 auto',
    padding: '32px',
  },
  
  // Page settings
  page: {
    minHeight: 'calc(100vh - 80px)',
    backgroundColor: '#f8fafc',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  
  // Dashboard specific settings
  dashboard: {
    padding: '20px',
    height: '100vh',
    backgroundColor: '#f8fafc',
  },
  
  // Navigation settings
  navigation: {
    maxWidth: MAX_WIDTH,
    height: '80px',
  },
  
  // Responsive breakpoints
  breakpoints: {
    mobile: '480px',
    tablet: '768px',
    desktop: '1024px',
    wide: '1600px',
  },
} as const;

// Helper function to get container styles
export const getContainerStyles = () => ({
  maxWidth: layoutConfig.container.maxWidth,
  margin: layoutConfig.container.margin,
});

// Helper function to get page wrapper styles
export const getPageWrapperStyles = () => ({
  minHeight: layoutConfig.page.minHeight,
  width: '100%',
  padding: layoutConfig.container.padding,
  fontFamily: layoutConfig.page.fontFamily,
});

// Helper function to get dashboard wrapper styles
export const getDashboardWrapperStyles = () => ({
  padding: layoutConfig.dashboard.padding,
  height: layoutConfig.dashboard.height,
  backgroundColor: layoutConfig.dashboard.backgroundColor,
});

// Helper to get the current max width (useful for other components)
export const getMaxWidth = () => layoutConfig.MAX_WIDTH; 