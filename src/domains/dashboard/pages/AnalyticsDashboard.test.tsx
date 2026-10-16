import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import AnalyticsDashboard from './AnalyticsDashboard';

function Location() { return <div data-testid="location">{useLocation().pathname}{useLocation().search}</div>; }

beforeEach(() => {
  global.mockInvoke.mockImplementation((command: string) => {
    if (command === 'get_dashboard_summary') return Promise.resolve({ period: '2026-10', active_students: 12, collected_cents: 12500000, pending_payments: 3, overdue_payments: 2, registered_sessions: 7 });
    if (command === 'get_dashboard_revenue_trend') return Promise.resolve([{ period: '2026-09', amount_cents: 0 }, { period: '2026-10', amount_cents: 12500000 }]);
    if (command === 'get_dashboard_students_trend') return Promise.resolve({ available: true, points: [{ period: '2026-09', count: 10 }, { period: '2026-10', count: 12 }] });
    if (command === 'get_dashboard_plan_distribution') return Promise.resolve([{ plan_id: 1, plan_name: 'Tres días', count: 8 }, { plan_id: null, plan_name: 'Sin plan asignado', count: 4 }]);
    if (command === 'get_dashboard_inactive_students') return Promise.resolve({ inactive_students_count: 2, max_days_inactive: 15, has_session_data: true, items: [{ person_id: 4, person_name: 'Ana Test', last_session_date: '2026-10-01', days_inactive: 15 }], page: 1, page_size: 10, total_pages: 1 });
    return Promise.reject(new Error(`unexpected ${command}`));
  });
});

test('renderiza los cinco indicadores y gráficos con tooltips accesibles', async () => {
  render(<MemoryRouter><AnalyticsDashboard /></MemoryRouter>);
  expect(await screen.findByText('12')).toBeInTheDocument();
  expect(screen.getByText('3')).toBeInTheDocument();
  expect(screen.getByText('Sesiones registradas')).toBeInTheDocument();
  expect(screen.getByText('7')).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'Evolución de recaudación' })).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'Evolución de alumnos activos' })).toBeInTheDocument();
  expect(screen.getByText('Tres días')).toBeInTheDocument();
  expect(screen.getByLabelText(/octubre de 2026.*125\.000/)).toBeInTheDocument();
  expect(screen.getByLabelText(/octubre de 2026: 12 alumnos/)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Alumnos sin asistir' })).toBeInTheDocument();
  expect(await screen.findByRole('button', { name: 'Ana Test' })).toBeInTheDocument();
});

test('cambia el umbral sin depender del período y abre la ficha del alumno', async () => {
  const user = userEvent.setup();
  render(<MemoryRouter initialEntries={['/dashboard']}><Routes><Route path="*" element={<><AnalyticsDashboard /><Location /></>} /></Routes></MemoryRouter>);
  await user.selectOptions(await screen.findByLabelText('Días sin asistir'), '14');
  await waitFor(() => expect(global.mockInvoke).toHaveBeenCalledWith('get_dashboard_inactive_students', expect.objectContaining({ thresholdDays: 14, pageSize: 8 })));
  const student = await screen.findByRole('button', { name: 'Ana Test' });
  await user.click(student);
  await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/personas?personId=4'));
});

test('navega a pagos conservando el período seleccionado', async () => {
  const user = userEvent.setup();
  render(<MemoryRouter initialEntries={['/dashboard']}><Routes><Route path="*" element={<><AnalyticsDashboard /><Location /></>} /></Routes></MemoryRouter>);
  await screen.findByText('12');
  await user.click(screen.getByRole('button', { name: /Recaudación mensual/ }));
  await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/pagos\?period=/));
});

test('navega a Personas con filtro real de vencidos y período', async () => {
  const user = userEvent.setup();
  render(<MemoryRouter initialEntries={['/dashboard']}><Routes><Route path="*" element={<><AnalyticsDashboard /><Location /></>} /></Routes></MemoryRouter>);
  await screen.findByText('12');
  await user.click(screen.getByRole('button', { name: /Pagos vencidos/ }));
  await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^\/personas\?paymentStatus=overdue&period=/));
});

test('un error de un gráfico no oculta los demás indicadores', async () => {
  global.mockInvoke.mockImplementation((command: string) => {
    if (command === 'get_dashboard_summary') return Promise.resolve({ period: '2026-10', active_students: 12, collected_cents: 0, pending_payments: 0, overdue_payments: 0, registered_sessions: 0 });
    if (command === 'get_dashboard_revenue_trend') return Promise.reject(new Error('falló tendencia'));
    if (command === 'get_dashboard_students_trend') return Promise.resolve({ available: false, points: [] });
    if (command === 'get_dashboard_inactive_students') return Promise.resolve({ inactive_students_count: 0, max_days_inactive: null, has_session_data: false, items: [], page: 1, page_size: 10, total_pages: 0 });
    return Promise.resolve([]);
  });
  render(<MemoryRouter><AnalyticsDashboard /></MemoryRouter>);
  expect(await screen.findByText('12')).toBeInTheDocument();
  expect(await screen.findByText(/falló tendencia/)).toBeInTheDocument();
  expect(screen.getByText('No hay información histórica suficiente.')).toBeInTheDocument();
});
