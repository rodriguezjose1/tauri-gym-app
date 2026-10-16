import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SearchInput } from './SearchInput';

describe('SearchInput', () => {
  it('actualiza el texto y permite limpiarlo desde el control integrado', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onClear = vi.fn();
    const { rerender } = render(<SearchInput value="" onChange={onChange} onClear={onClear} placeholder="Buscar" ariaLabel="Buscar catálogo" />);
    await user.type(screen.getByRole('textbox', { name: 'Buscar catálogo' }), 'a');
    expect(onChange).toHaveBeenCalledWith('a');
    rerender(<SearchInput value="Ana" onChange={onChange} onClear={onClear} placeholder="Buscar" ariaLabel="Buscar catálogo" />);
    await user.click(screen.getByRole('button', { name: 'Limpiar búsqueda' }));
    expect(onClear).toHaveBeenCalledOnce();
  });
});
