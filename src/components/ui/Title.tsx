import React from 'react';
import './Title.css';

export interface TitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'default';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  align?: 'left' | 'center' | 'right';
  children: React.ReactNode;
}

export const Title: React.FC<TitleProps> = ({
  level = 1,
  variant = 'default',
  size,
  weight = 'bold',
  align = 'left',
  className = '',
  children,
  ...props
}) => {
  // Default sizes based on heading level if no size is specified
  const defaultSizes: Record<number, string> = {
    1: '3xl',
    2: '2xl',
    3: 'xl',
    4: 'lg',
    5: 'md',
    6: 'sm'
  };
  
  const finalSize = size || defaultSizes[level];
  
  const classes = [
    'ui-title',
    `ui-title--${variant}`,
    `ui-title--${finalSize}`,
    `ui-title--${weight}`,
    `ui-title--${align}`,
    className
  ].filter(Boolean).join(' ');

  const headingProps = {
    className: classes,
    ...props
  };

  switch (level) {
    case 1:
      return <h1 {...headingProps}>{children}</h1>;
    case 2:
      return <h2 {...headingProps}>{children}</h2>;
    case 3:
      return <h3 {...headingProps}>{children}</h3>;
    case 4:
      return <h4 {...headingProps}>{children}</h4>;
    case 5:
      return <h5 {...headingProps}>{children}</h5>;
    case 6:
      return <h6 {...headingProps}>{children}</h6>;
    default:
      return <h1 {...headingProps}>{children}</h1>;
  }
}; 