import type { ReactNode } from 'react';
import { Title } from '../base';
import './ManagementPageHeader.css';

interface ManagementPageHeaderProps {
  title: string;
  action?: ReactNode;
}

export function ManagementPageHeader({ title, action }: ManagementPageHeaderProps) {
  return (
    <div className="management-page-header">
      <Title level={2} variant="default">{title}</Title>
      {action && <div className="management-page-header__action">{action}</div>}
    </div>
  );
}

interface ManagementToolbarProps {
  tabs?: ReactNode;
  search?: ReactNode;
  children?: ReactNode;
}

export function ManagementToolbar({ tabs, search, children }: ManagementToolbarProps) {
  if (!tabs && !search && !children) return null;

  return (
    <div className="management-toolbar">
      {tabs && <div className="management-toolbar__tabs">{tabs}</div>}
      <div className="management-toolbar__controls">
        {search && <div className="management-toolbar__search">{search}</div>}
        {children}
      </div>
    </div>
  );
}
