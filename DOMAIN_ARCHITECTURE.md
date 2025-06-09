# Arquitectura por Dominios - Tauri Gym App

## 📋 Resumen

Este proyecto ha sido refactorizado siguiendo una **arquitectura por dominios** (Domain-Driven Design) para mejorar la organización, mantenibilidad y escalabilidad del código.

## 🏗️ Estructura de Dominios

```
src/domains/
├── person/           # Dominio de Personas
├── exercise/         # Dominio de Ejercicios  
├── workout/          # Dominio de Entrenamientos
├── routine/          # Dominio de Rutinas
└── index.ts          # Barrel export principal
```

### 📁 Estructura de cada Dominio

Cada dominio sigue la misma estructura consistente:

```
src/domains/{domain}/
├── components/       # Componentes específicos del dominio
│   ├── Component1.tsx
│   ├── Component2.tsx
│   └── index.ts     # Barrel export de componentes
├── hooks/           # Hooks específicos del dominio
│   ├── useHook1.ts
│   ├── useHook2.ts
│   └── index.ts     # Barrel export de hooks
├── services/        # Servicios específicos del dominio
│   ├── service.ts
│   └── index.ts     # Barrel export de servicios
└── index.ts         # Barrel export del dominio completo
```

## 🎯 Dominios Implementados

### 👤 Person Domain
**Responsabilidad**: Gestión de personas/usuarios
- **Componentes**: `PersonSearch`
- **Hooks**: `usePeopleData`
- **Servicios**: `PersonService`

### 💪 Exercise Domain
**Responsabilidad**: Gestión de ejercicios
- **Componentes**: `ExerciseAutocomplete`, `SortableExerciseItem`, `SortableExerciseList`
- **Hooks**: `useExercisesData`
- **Servicios**: `ExerciseService`

### 🏋️ Workout Domain
**Responsabilidad**: Gestión de entrenamientos
- **Componentes**: `WorkoutModals`, `SortableWorkoutItem`
- **Hooks**: `useWorkoutData`, `useWorkoutOperations`, `useWorkoutValidation`, `useSaveWorkoutEntry`, `useSaveWorkoutSession`
- **Servicios**: `WorkoutService`

### 📋 Routine Domain
**Responsabilidad**: Gestión de rutinas
- **Componentes**: `RoutineManager`, `LoadRoutineModal`
- **Hooks**: `useRoutinesData`, `useRoutineOperations`, `useApplyRoutineToDate`, `useLoadRoutine`
- **Servicios**: `RoutineService`

## 📦 Barrel Exports

### Importaciones Optimizadas

**Antes:**
```typescript
import { PersonSearch } from '../domains/person/components/PersonSearch';
import { ExerciseAutocomplete } from '../domains/exercise/components/ExerciseAutocomplete';
import { WorkoutModals } from '../domains/workout/components/WorkoutModals';
```

**Después:**
```typescript
import { PersonSearch } from '../domains/person';
import { ExerciseAutocomplete } from '../domains/exercise';
import { WorkoutModals } from '../domains/workout';
```

### Importación desde el barrel principal
```typescript
import { 
  PersonSearch, 
  ExerciseAutocomplete, 
  WorkoutModals, 
  RoutineManager 
} from '../domains';
```

## 🔄 Migración Completada

### ✅ Fases Implementadas

1. **Migración de Hooks por Dominios** ✅
   - Hooks movidos a sus respectivos dominios
   - Imports actualizados en toda la aplicación

2. **Migración de Componentes por Dominios** ✅
   - Componentes organizados por dominio de responsabilidad
   - Barrel exports creados para cada dominio

3. **Migración de Services por Dominios** ✅
   - Services ya estaban organizados por dominios
   - Barrel exports añadidos para consistencia

4. **Creación de Barrel Exports** ✅
   - Exports organizados en cada nivel (componentes, hooks, services)
   - Export principal por dominio
   - Export global de todos los dominios

5. **Optimización de Imports** ✅
   - Imports actualizados para usar barrel exports
   - Rutas de importación simplificadas

## 🎨 Beneficios de la Arquitectura

### 🔍 Organización Clara
- Cada dominio tiene una responsabilidad específica
- Fácil localización de código relacionado
- Estructura predecible y consistente

### 🚀 Escalabilidad
- Nuevos dominios pueden añadirse fácilmente
- Cada dominio puede evolucionar independientemente
- Separación clara de responsabilidades

### 🛠️ Mantenibilidad
- Cambios en un dominio no afectan otros
- Testing más enfocado por dominio
- Refactoring más seguro y localizado

### 📈 Reutilización
- Componentes y hooks reutilizables entre dominios
- Barrel exports facilitan las importaciones
- Interfaces claras entre dominios

## 🔧 Convenciones de Desarrollo

### Añadir Nuevo Componente
1. Crear el componente en `src/domains/{domain}/components/`
2. Exportar en `src/domains/{domain}/components/index.ts`
3. El export estará disponible automáticamente en `src/domains/{domain}/index.ts`

### Añadir Nuevo Hook
1. Crear el hook en `src/domains/{domain}/hooks/`
2. Exportar en `src/domains/{domain}/hooks/index.ts`
3. El export estará disponible automáticamente en `src/domains/{domain}/index.ts`

### Añadir Nuevo Servicio
1. Crear el servicio en `src/domains/{domain}/services/`
2. Exportar en `src/domains/{domain}/services/index.ts`
3. El export estará disponible automáticamente en `src/domains/{domain}/index.ts`

## 📊 Métricas de Migración

- **Componentes migrados**: 7 componentes organizados por dominio
- **Hooks migrados**: 12 hooks organizados por dominio  
- **Services organizados**: 4 services con barrel exports
- **Archivos de barrel exports creados**: 16 archivos
- **Imports optimizados**: 8+ archivos con imports simplificados

## 🎯 Próximos Pasos Sugeridos

1. **Code Splitting**: Implementar lazy loading por dominios
2. **Testing por Dominios**: Organizar tests siguiendo la estructura de dominios
3. **Documentación de APIs**: Documentar interfaces entre dominios
4. **Métricas de Performance**: Analizar impacto en bundle size por dominio 