import React from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { Modal } from './Modal';

afterEach(() => {
  document.body.style.overflow = '';
});

test('mantiene bloqueado el fondo mientras quede un modal abierto', () => {
  const onClose = vi.fn();
  const { rerender, unmount } = render(
    <>
      <Modal isOpen onClose={onClose}>Principal</Modal>
      <Modal isOpen onClose={onClose}>Secundario</Modal>
    </>,
  );

  expect(document.body.style.overflow).toBe('hidden');

  rerender(
    <>
      <Modal isOpen onClose={onClose}>Principal</Modal>
      <Modal isOpen={false} onClose={onClose}>Secundario</Modal>
    </>,
  );

  expect(document.body.style.overflow).toBe('hidden');

  act(() => unmount());
  expect(document.body.style.overflow).toBe('');
});
