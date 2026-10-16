export const billingTexts = {
  page: {
    title: 'Pagos',
    description: 'Registra pagos y consulta el historial mensual.',
    register: 'Registrar pago',
    history: 'Historial',
    empty: 'No hay pagos registrados en este período.',
    searchLabel: 'Buscar pagos por persona',
    searchPlaceholder: 'Buscar persona…',
    clearSearch: 'Limpiar búsqueda',
    emptySearch: (query: string) => `No hay pagos de personas que coincidan con “${query}”.`,
    success: 'Pago registrado correctamente',
  },
  paymentDialog: {
    title: 'Registrar pago',
    submit: 'Confirmar pago',
    submitting: 'Registrando…',
    alreadyPaid: 'Ese período ya está pagado.',
  },
  plans: {
    title: 'Planes',
    description: 'Define las opciones que se pueden seleccionar al registrar un pago.',
    empty: 'Todavía no hay planes. Creá el primero para comenzar a registrar pagos.',
    loading: 'Cargando planes…',
    new: 'Nuevo plan',
  },
  table: {
    paymentDate: 'Fecha del pago',
    paid: 'Pagado',
  },
} as const;
