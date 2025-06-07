// Layout configuration for consistent styling across all pages

// Main layout constant - Change this value to adjust all pages at once
const MAX_WIDTH = 'none'; // Use full screen width

export const layoutConfig = {
  // Main layout settings
  MAX_WIDTH,
  
  // Container settings
  container: {
    maxWidth: MAX_WIDTH,
    margin: '0 auto',
    padding: '24px',
  },
  
  // Page settings
  page: {
    minHeight: 'calc(100vh - 80px)',
    backgroundColor: 'var(--bg-secondary)',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  
  // Dashboard specific settings
  dashboard: {
    padding: '16px',
    height: '100vh',
    backgroundColor: 'var(--bg-secondary)',
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
  padding: layoutConfig.container.padding,
  width: '100%',
});

// Helper function to get page wrapper styles
export const getPageWrapperStyles = () => ({
  minHeight: layoutConfig.page.minHeight,
  width: '100%',
  backgroundColor: layoutConfig.page.backgroundColor,
  fontFamily: layoutConfig.page.fontFamily,
});

// Helper function to get dashboard wrapper styles
export const getDashboardWrapperStyles = () => ({
  padding: layoutConfig.dashboard.padding,
  height: layoutConfig.dashboard.height,
  backgroundColor: layoutConfig.dashboard.backgroundColor,
  width: '100%',
});

// Helper to get the current max width (useful for other components)
export const getMaxWidth = () => layoutConfig.MAX_WIDTH; 