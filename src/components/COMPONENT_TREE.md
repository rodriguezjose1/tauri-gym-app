# Estructura de Árbol de Componentes

Esta documentación muestra la jerarquía y dependencias de los componentes para entender rápidamente quién usa a quién.

## 🌳 Árbol de Dependencias

```
src/components/
├── base/                           # Componentes base (nivel 0 - no dependen de otros)
│   ├── Button.tsx                  # ✅ Componente primitivo
│   ├── Input.tsx                   # ✅ Componente primitivo
│   ├── Card.tsx                    # ✅ Componente primitivo
│   ├── Title.tsx                   # ✅ Componente primitivo
│   └── Modal.tsx                   # ✅ Componente primitivo
│
├── modals/                         # Componentes de modales (nivel 1 - usan base)
│   ├── InfoModal.tsx               # 📦 Usa: Modal, Button
│   ├── ConfirmationModal.tsx       # 📦 Usa: Modal, Button
│   └── DeleteConfirmationModal.tsx # 📦 Usa: Modal, Button
│
├── forms/                          # Componentes de formularios (nivel 1-2)
│   ├── PersonSearch.tsx            # 📦 Usa: Input, Card
│   └── ExerciseAutocomplete.tsx    # 📦 Usa: Input, Card
│
├── lists/                          # Componentes de listas (nivel 2)
│   ├── SortableWorkoutItem.tsx     # 📦 Usa: Card, Button
│   ├── SortableExerciseItem.tsx    # 📦 Usa: Card, Button
│   └── SortableExerciseList.tsx    # 📦 Usa: SortableExerciseItem
│
├── calendar/                       # Componentes de calendario (nivel 2-3)
│   ├── DayCell.tsx                 # 📦 Usa: Card, Button
│   ├── CalendarHeader.tsx          # 📦 Usa: Button, Title
│   ├── CalendarGrid.tsx            # 📦 Usa: DayCell, SortableWorkoutItem
│   └── WeeklyCalendar.tsx          # 📦 Usa: PersonSearch, SortableWorkoutItem, CalendarGrid
│
├── complex/                        # Componentes complejos (nivel 3-4)
│   ├── WorkoutModals.tsx           # 📦 Usa: Modal, Input, Button, ExerciseAutocomplete
│   └── RoutineManager.tsx          # 📦 Usa: Card, Button, Input, SortableExerciseList
│
└── pages/                          # Componentes de página (nivel 4-5)
    ├── Dashboard.tsx               # 📦 Usa: WeeklyCalendar, WorkoutModals, PersonSearch
    └── PersonCrud.tsx              # 📦 Usa: Card, Button, Input, Modal
```

## 📊 Niveles de Dependencia

### Nivel 0 - Componentes Base (Primitivos)
- **No dependen de otros componentes**
- Son la base de todo el sistema
- Ejemplos: Button, Input, Card, Title, Modal

### Nivel 1 - Componentes Simples
- **Dependen solo de componentes base**
- Funcionalidad específica pero simple
- Ejemplos: InfoModal, PersonSearch

### Nivel 2 - Componentes Intermedios
- **Dependen de componentes base y nivel 1**
- Funcionalidad más compleja
- Ejemplos: SortableWorkoutItem, CalendarGrid

### Nivel 3 - Componentes Complejos
- **Dependen de múltiples niveles anteriores**
- Funcionalidad avanzada
- Ejemplos: WeeklyCalendar, WorkoutModals

### Nivel 4+ - Componentes de Página
- **Orquestan múltiples componentes complejos**
- Lógica de negocio de alto nivel
- Ejemplos: Dashboard, PersonCrud

## 🔄 Flujo de Dependencias

```
Pages (Dashboard, PersonCrud)
    ↓
Complex Components (WeeklyCalendar, WorkoutModals, RoutineManager)
    ↓
Intermediate Components (SortableItems, CalendarGrid, Forms)
    ↓
Simple Components (Modals, Search)
    ↓
Base Components (Button, Input, Card, Title, Modal)
```

## 📁 Organización por Funcionalidad

### `/base` - Componentes Primitivos
- Componentes reutilizables sin dependencias
- Estilo y comportamiento básico
- Usados por todos los demás componentes

### `/modals` - Componentes de Modales
- Diferentes tipos de modales
- Todos usan Modal base + Button

### `/forms` - Componentes de Formularios
- Búsquedas y autocompletados
- Validación y entrada de datos

### `/lists` - Componentes de Listas
- Items arrastrables y ordenables
- Listas de elementos

### `/calendar` - Componentes de Calendario
- Funcionalidad específica del calendario
- Visualización temporal

### `/complex` - Componentes Complejos
- Combinan múltiples funcionalidades
- Lógica de negocio compleja

## 🎯 Beneficios de esta Estructura

1. **Claridad**: Fácil entender dependencias
2. **Mantenibilidad**: Cambios controlados por nivel
3. **Reutilización**: Componentes base muy reutilizables
4. **Testing**: Fácil testear por niveles
5. **Performance**: Optimización por capas

## 🚀 Reglas de Dependencia

1. **Componentes de nivel N solo pueden usar componentes de nivel N-1 o menor**
2. **No dependencias circulares**
3. **Componentes base no dependen de nadie**
4. **Páginas pueden usar cualquier componente** 