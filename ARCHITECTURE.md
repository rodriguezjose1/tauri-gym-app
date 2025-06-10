# 🏗️ Arquitectura de la Aplicación Tauri Gym App

## 📋 Resumen

Esta aplicación utiliza una **arquitectura basada en dominios** (Domain-Driven Design) que organiza el código por áreas de negocio en lugar de por tipo de archivo. Esta estructura mejora la mantenibilidad, escalabilidad y comprensión del código.

## 🗂️ Estructura de Carpetas

```
src/
├── 📁 domains/                    # Dominios de negocio
│   ├── 📁 person/                 # Dominio de personas/clientes
│   │   ├── 📁 components/         # Componentes específicos del dominio
│   │   │   └── PersonSearch.tsx   # Búsqueda de personas
│   │   ├── 📁 pages/              # Páginas del dominio
│   │   │   ├── PersonCrud.tsx     # CRUD de personas
│   │   │   └── index.ts           # Barrel export de páginas
│   │   └── index.ts               # Barrel export del dominio
│   │
│   ├── 📁 exercise/               # Dominio de ejercicios
│   │   ├── 📁 components/         # Componentes de ejercicios
│   │   │   ├── ExerciseAutocomplete.tsx
│   │   │   ├── SortableExerciseItem.tsx
│   │   │   ├── SortableExerciseList.tsx
│   │   │   └── index.ts
│   │   ├── 📁 pages/              # Páginas de ejercicios
│   │   │   ├── ExerciseCrud.tsx   # CRUD de ejercicios
│   │   │   └── index.ts
│   │   └── index.ts               # Barrel export del dominio
│   │
│   ├── 📁 workout/                # Dominio de entrenamientos
│   │   ├── 📁 components/         # Componentes de entrenamientos
│   │   │   ├── SortableWorkoutItem.tsx
│   │   │   ├── WorkoutModals.tsx
│   │   │   └── index.ts
│   │   └── index.ts               # Barrel export del dominio
│   │
│   ├── 📁 routine/                # Dominio de rutinas
│   │   ├── 📁 components/         # Componentes de rutinas
│   │   │   ├── RoutineManager.tsx # Gestor principal de rutinas
│   │   │   └── index.ts
│   │   └── index.ts               # Barrel export del dominio
│   │
│   ├── 📁 dashboard/              # Dominio del dashboard
│   │   ├── 📁 components/         # Componentes del dashboard
│   │   │   ├── CalendarGrid.tsx   # Grilla del calendario
│   │   │   ├── CalendarHeader.tsx # Cabecera del calendario
│   │   │   ├── DayCell.tsx        # Celda de día
│   │   │   ├── WeeklyCalendar.tsx # Calendario semanal
│   │   │   └── index.ts
│   │   ├── 📁 pages/              # Páginas del dashboard
│   │   │   ├── Dashboard.tsx      # Página principal
│   │   │   └── index.ts
│   │   └── index.ts               # Barrel export del dominio
│   │
│   └── 📁 settings/               # Dominio de configuraciones
│       ├── 📁 components/         # Componentes de configuración
│       │   ├── SettingsModal.tsx  # Modal de configuraciones
│       │   └── index.ts
│       ├── 📁 pages/              # Páginas de configuración
│       │   ├── ConfiguracionesPage.jsx
│       │   └── index.ts
│       └── index.ts               # Barrel export del dominio
│
├── 📁 shared/                     # Componentes compartidos
│   ├── 📁 components/             # Componentes reutilizables
│   │   ├── 📁 base/               # Componentes base (UI primitivos)
│   │   │   ├── Button.tsx         # Botón reutilizable
│   │   │   ├── Input.tsx          # Input reutilizable
│   │   │   ├── Card.tsx           # Tarjeta reutilizable
│   │   │   ├── Modal.tsx          # Modal base
│   │   │   ├── Title.tsx          # Título reutilizable
│   │   │   ├── ErrorMessage.tsx   # Mensaje de error
│   │   │   └── index.ts           # Barrel export
│   │   │
│   │   ├── 📁 modals/             # Modales específicos
│   │   │   ├── ConfirmationModal.tsx
│   │   │   ├── DeleteConfirmationModal.tsx
│   │   │   ├── InfoModal.tsx
│   │   │   └── index.ts
│   │   │
│   │   └── 📁 notifications/      # Sistema de notificaciones
│   │       ├── ToastContainer.tsx
│   │       ├── ToastNotification.tsx
│   │       └── index.ts
│   │
│   ├── 📁 hooks/                  # Hooks personalizados compartidos
│   │   └── useToastNotifications.ts
│   │
│   ├── 📁 types/                  # Tipos TypeScript compartidos
│   │   └── dashboard.ts
│   │
│   └── 📁 constants/              # Constantes compartidas
│       └── index.ts
│
├── 📁 services/                   # Servicios de datos
│   ├── PersonService.ts           # Servicio de personas
│   ├── ExerciseService.ts         # Servicio de ejercicios
│   ├── RoutineService.ts          # Servicio de rutinas
│   ├── WorkoutService.ts          # Servicio de entrenamientos
│   ├── types.ts                   # Tipos de datos
│   └── index.ts                   # Barrel export
│
├── 📁 styles/                     # Archivos CSS
│   ├── theme.css                  # Tema global
│   ├── App.css                    # Estilos de la app principal
│   ├── Dashboard.css              # Estilos del dashboard
│   ├── PersonCrud.css             # Estilos del CRUD de personas
│   ├── ExerciseCrud.css           # Estilos del CRUD de ejercicios
│   ├── RoutineManager.css         # Estilos del gestor de rutinas
│   ├── WorkoutModals.css          # Estilos de modales de entrenamientos
│   ├── CalendarGrid.css           # Estilos de la grilla del calendario
│   ├── CalendarHeader.css         # Estilos de la cabecera del calendario
│   ├── DayCell.css                # Estilos de las celdas de día
│   ├── WeeklyCalendar.css         # Estilos del calendario semanal
│   ├── ToastContainer.css         # Estilos del contenedor de notificaciones
│   ├── ToastNotification.css      # Estilos de las notificaciones
│   ├── ConfirmationModal.css      # Estilos del modal de confirmación
│   ├── DeleteConfirmationModal.css # Estilos del modal de eliminación
│   ├── InfoModal.css              # Estilos del modal de información
│   ├── SettingsModal.css          # Estilos del modal de configuraciones
│   ├── PersonSearch.css           # Estilos de búsqueda de personas
│   ├── ExerciseAutocomplete.css   # Estilos del autocompletado de ejercicios
│   ├── SortableExerciseItem.css   # Estilos de elementos de ejercicio ordenables
│   ├── SortableExerciseList.css   # Estilos de lista de ejercicios ordenables
│   ├── SortableWorkoutItem.css    # Estilos de elementos de entrenamiento ordenables
│   └── ConfiguracionesPage.css    # Estilos de la página de configuraciones
│
├── 📁 config/                     # Configuraciones
├── 📁 assets/                     # Recursos estáticos
├── 📁 test/                       # Archivos de prueba
├── App.jsx                        # Componente principal de la aplicación
├── main.jsx                       # Punto de entrada de React
├── index.css                      # Estilos globales
└── tsconfig.json                  # Configuración de TypeScript
```

## 🎯 Principios de la Arquitectura

### 1. **Separación por Dominios**
Cada dominio representa un área específica del negocio:
- **Person**: Gestión de clientes/personas
- **Exercise**: Catálogo y gestión de ejercicios
- **Workout**: Entrenamientos individuales
- **Routine**: Rutinas de ejercicios
- **Dashboard**: Vista principal y calendario
- **Settings**: Configuraciones de la aplicación

### 2. **Componentes Compartidos**
La carpeta `shared/` contiene elementos reutilizables:
- **Base**: Componentes UI primitivos (Button, Input, Card, etc.)
- **Modals**: Modales específicos para diferentes propósitos
- **Notifications**: Sistema de notificaciones toast

### 3. **Barrel Exports**
Cada dominio y carpeta de componentes incluye un archivo `index.ts` que actúa como "barrel export", facilitando las importaciones:

```typescript
// En lugar de:
import { PersonCrud } from './domains/person/pages/PersonCrud';
import { PersonSearch } from './domains/person/components/PersonSearch';

// Podemos usar:
import { PersonCrud, PersonSearch } from './domains/person';
```

## 📦 Patrones de Importación

### Importaciones entre Dominios
```typescript
// ✅ Correcto: Importar desde otros dominios
import { ExerciseAutocomplete } from '../../exercise';
import { SortableWorkoutItem } from '../../workout';

// ✅ Correcto: Importar componentes compartidos
import { Button, Input } from '../../../shared/components/base';
import { DeleteConfirmationModal } from '../../../shared/components/modals';
```

### Importaciones de Servicios
```typescript
// ✅ Correcto: Importar servicios
import { PersonService, ExerciseService } from '../../../services';
```

### Importaciones de Estilos
```typescript
// ✅ Correcto: Importar CSS desde la carpeta styles
import '../../../styles/ComponentName.css';
```

## 🔧 Ventajas de esta Arquitectura

### ✅ **Mantenibilidad**
- Código organizado por funcionalidad de negocio
- Fácil localización de componentes relacionados
- Cambios aislados por dominio

### ✅ **Escalabilidad**
- Fácil adición de nuevos dominios
- Componentes reutilizables bien organizados
- Estructura consistente

### ✅ **Comprensión**
- Estructura intuitiva que refleja el negocio
- Separación clara de responsabilidades
- Documentación implícita a través de la organización

### ✅ **Reutilización**
- Componentes base compartidos
- Hooks personalizados centralizados
- Servicios de datos unificados

## 🚀 Cómo Trabajar con esta Estructura

### Agregar un Nuevo Dominio
1. Crear carpeta en `src/domains/nuevo-dominio/`
2. Crear subcarpetas `components/` y `pages/` (si es necesario)
3. Crear archivo `index.ts` para barrel exports
4. Agregar estilos en `src/styles/`

### Agregar un Nuevo Componente Compartido
1. Determinar si va en `base/`, `modals/` o `notifications/`
2. Crear el componente en la carpeta apropiada
3. Exportarlo en el `index.ts` correspondiente
4. Agregar estilos en `src/styles/`

### Modificar un Dominio Existente
1. Localizar el dominio en `src/domains/`
2. Modificar componentes o páginas según sea necesario
3. Actualizar exports si se agregan nuevos archivos
4. Actualizar estilos relacionados

## 📝 Notas Importantes

- **Todos los archivos CSS** están centralizados en `src/styles/`
- **Los servicios** están separados de la lógica de UI
- **Los tipos TypeScript** están organizados por contexto
- **Las constantes** están centralizadas en `shared/constants/`
- **Los hooks personalizados** están en `shared/hooks/`

Esta arquitectura facilita el desarrollo colaborativo, el mantenimiento a largo plazo y la escalabilidad de la aplicación. 