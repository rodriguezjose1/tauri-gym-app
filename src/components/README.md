# 🧩 Componentes - Estructura de Árbol

Esta carpeta contiene todos los componentes de la aplicación organizados en una **estructura de árbol jerárquica** basada en dependencias.

## 📁 Estructura Actual

```
src/components/
├── 📄 COMPONENT_TREE.md          # Documentación detallada del árbol
├── 📄 index.ts                   # Exportaciones principales
├── 📄 README.md                  # Este archivo
│
├── 🔧 base/                      # Nivel 0 - Componentes primitivos
│   ├── Button.tsx                # Botón base reutilizable
│   ├── Input.tsx                 # Input base reutilizable  
│   ├── Card.tsx                  # Tarjeta base reutilizable
│   ├── Title.tsx                 # Título base reutilizable
│   ├── Modal.tsx                 # Modal base reutilizable
│   └── index.ts                  # Exportaciones base
│
├── 🔔 modals/                    # Nivel 1 - Modales específicos
│   ├── InfoModal.tsx             # Modal de información
│   ├── ConfirmationModal.tsx     # Modal de confirmación
│   ├── DeleteConfirmationModal.tsx # Modal de confirmación de eliminación
│   └── index.ts                  # Exportaciones modales
│
├── 📝 forms/                     # Nivel 1-2 - Componentes de formularios
│   ├── PersonSearch.tsx          # Búsqueda de personas
│   ├── ExerciseAutocomplete.tsx  # Autocompletado de ejercicios
│   └── index.ts                  # Exportaciones formularios
│
├── 📋 lists/                     # Nivel 2 - Componentes de listas
│   ├── SortableWorkoutItem.tsx   # Item de entrenamiento arrastrable
│   ├── SortableExerciseItem.tsx  # Item de ejercicio arrastrable
│   ├── SortableExerciseList.tsx  # Lista de ejercicios arrastrables
│   └── index.ts                  # Exportaciones listas
│
├── 📅 calendar/                  # Nivel 2-3 - Componentes de calendario
│   ├── DayCell.tsx               # Celda de día del calendario
│   ├── CalendarHeader.tsx        # Cabecera del calendario
│   ├── CalendarGrid.tsx          # Grilla del calendario
│   ├── WeeklyCalendar.tsx        # Calendario semanal completo
│   └── index.ts                  # Exportaciones calendario
│
└── 🏗️ complex/                   # Nivel 3-4 - Componentes complejos
    ├── WorkoutModals.tsx         # Modales de entrenamientos
    ├── RoutineManager.tsx        # Gestor de rutinas
    └── index.ts                  # Exportaciones complejos
```

## 🎯 Principios de Organización

### 1. **Jerarquía por Dependencias**
- **Nivel 0**: Componentes que no dependen de otros
- **Nivel 1**: Dependen solo de componentes base
- **Nivel 2**: Dependen de base + nivel 1
- **Nivel 3+**: Dependen de múltiples niveles

### 2. **Agrupación Funcional**
- **base**: Primitivos reutilizables
- **modals**: Diferentes tipos de modales
- **forms**: Formularios y búsquedas
- **lists**: Listas y elementos arrastrables
- **calendar**: Funcionalidad de calendario
- **complex**: Componentes con lógica compleja

### 3. **Reglas de Importación**
- ✅ Componentes pueden importar de niveles inferiores
- ❌ Componentes NO pueden importar de niveles superiores
- ❌ NO dependencias circulares

## 📦 Cómo Usar

### Importación Individual
```typescript
import { Button } from '../components/base';
import { InfoModal } from '../components/modals';
import { PersonSearch } from '../components/forms';
```

### Importación Desde Índice Principal
```typescript
import { 
  Button, 
  InfoModal, 
  PersonSearch,
  WeeklyCalendar 
} from '../components';
```

## 🔄 Flujo de Dependencias

```
📄 Pages (Dashboard, PersonCrud)
    ↓
🏗️ Complex Components (WeeklyCalendar, WorkoutModals)
    ↓
📅📋 Intermediate Components (Calendar, Lists)
    ↓
📝🔔 Simple Components (Forms, Modals)
    ↓
🔧 Base Components (Button, Input, Card, etc.)
```

## ✨ Beneficios

1. **🔍 Claridad**: Fácil entender quién usa qué
2. **🛠️ Mantenibilidad**: Cambios controlados por nivel
3. **♻️ Reutilización**: Componentes base muy reutilizables
4. **🧪 Testing**: Fácil testear por niveles independientes
5. **⚡ Performance**: Optimización por capas
6. **📚 Escalabilidad**: Estructura que crece ordenadamente

## 📋 Checklist de Nuevos Componentes

Cuando agregues un nuevo componente:

- [ ] ¿En qué nivel va según sus dependencias?
- [ ] ¿Está en la carpeta funcional correcta?
- [ ] ¿Actualicé el archivo `index.ts` correspondiente?
- [ ] ¿Documenté sus dependencias?
- [ ] ¿Sigue las reglas de importación?

## 📖 Documentación Detallada

Para más información sobre la estructura y dependencias específicas, consulta:
- 📄 `COMPONENT_TREE.md` - Documentación completa del árbol
- 🔗 Cada `index.ts` - Exportaciones por categoría 