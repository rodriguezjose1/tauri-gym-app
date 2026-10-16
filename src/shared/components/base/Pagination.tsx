import React from 'react';
import { Button } from './Button';
import './Pagination.css';

interface PaginationProps {
  total: number;
  page: number;
  totalPages: number;
  singularLabel: string;
  pluralLabel: string;
  loading?: boolean;
  onPageChange: (page: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({ total, page, totalPages, singularLabel, pluralLabel, loading = false, onPageChange, className = '' }) => {
  const effectiveTotalPages = Math.max(totalPages, 1);
  const effectivePage = Math.min(Math.max(page, 1), effectiveTotalPages);

  return (
    <nav className={['ui-pagination', className].filter(Boolean).join(' ')} aria-label={`Paginación de ${pluralLabel}`}>
      <span className="ui-pagination__summary">
        {total} {total === 1 ? singularLabel : pluralLabel} · Página {effectivePage} de {effectiveTotalPages}
      </span>
      <span className="ui-pagination__actions">
        <Button size="sm" variant="secondary" disabled={loading || effectivePage <= 1} onClick={() => onPageChange(effectivePage - 1)}>Anterior</Button>
        <Button size="sm" variant="secondary" disabled={loading || effectivePage >= effectiveTotalPages} onClick={() => onPageChange(effectivePage + 1)}>Siguiente</Button>
      </span>
    </nav>
  );
};
