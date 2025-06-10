# 🏋️ Tauri Gym App

Una aplicación de gestión de gimnasio construida con **Tauri**, **React** y **TypeScript**, diseñada para ayudar a entrenadores y usuarios a gestionar entrenamientos, rutinas, ejercicios y clientes de manera eficiente.

## 🚀 Características Principales

- **📊 Dashboard Interactivo**: Vista de calendario con entrenamientos organizados por semanas
- **👥 Gestión de Personas**: CRUD completo para clientes/usuarios
- **💪 Catálogo de Ejercicios**: Base de datos de ejercicios con autocompletado
- **📋 Rutinas Personalizadas**: Creación y gestión de rutinas con drag & drop
- **🗓️ Entrenamientos**: Programación y seguimiento de entrenamientos
- **⚙️ Configuraciones**: Personalización de la aplicación
- **🔔 Notificaciones**: Sistema de notificaciones toast integrado

## 🏗️ Arquitectura

Esta aplicación utiliza una **arquitectura basada en dominios** que organiza el código por áreas de negocio:

```
src/
├── domains/          # Dominios de negocio
│   ├── person/       # Gestión de personas/clientes
│   ├── exercise/     # Catálogo de ejercicios
│   ├── workout/      # Entrenamientos
│   ├── routine/      # Rutinas de ejercicios
│   ├── dashboard/    # Vista principal y calendario
│   └── settings/     # Configuraciones
├── shared/           # Componentes compartidos
│   ├── components/   # UI components reutilizables
│   ├── hooks/        # Custom hooks
│   ├── types/        # Tipos TypeScript
│   └── constants/    # Constantes
├── services/         # Servicios de datos
├── styles/           # Archivos CSS
└── config/           # Configuraciones
```

Para más detalles, consulta [ARCHITECTURE.md](./ARCHITECTURE.md).

## 🛠️ Tecnologías Utilizadas

### Frontend
- **React 18** - Biblioteca de UI
- **TypeScript** - Tipado estático
- **Vite** - Build tool y dev server
- **@dnd-kit** - Drag and drop functionality
- **CSS Modules** - Estilos modulares

### Backend/Desktop
- **Tauri** - Framework para aplicaciones desktop
- **Rust** - Backend nativo
- **SQLite** - Base de datos local

### Herramientas de Desarrollo
- **ESLint** - Linting de código
- **Prettier** - Formateo de código
- **TypeScript** - Verificación de tipos

## 📦 Instalación y Configuración

### Prerrequisitos
- **Node.js** (v16 o superior)
- **npm** o **yarn**
- **Rust** (para desarrollo con Tauri)

### Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <repository-url>
   cd tauri-gym-app
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar Tauri** (si es necesario)
   ```bash
   npm run tauri:setup
   ```

## 🚀 Scripts Disponibles

### Desarrollo
```bash
# Ejecutar en modo desarrollo (web)
npm run dev

# Ejecutar aplicación Tauri en desarrollo
npm run tauri dev
```

### Construcción
```bash
# Build para producción (web)
npm run build

# Build de la aplicación Tauri
npm run tauri build
```

### Calidad de Código
```bash
# Ejecutar linter
npm run lint

# Formatear código
npm run format

# Verificar tipos TypeScript
npm run type-check
```

## 🎯 Uso de la Aplicación

### Dashboard
- **Vista de calendario** con entrenamientos organizados por semanas
- **Navegación temporal** (anterior/siguiente/hoy)
- **Drag & drop** para reorganizar entrenamientos
- **Agregar entrenamientos** directamente desde el calendario

### Gestión de Personas
- **Crear, editar y eliminar** clientes
- **Búsqueda avanzada** de personas
- **Información detallada** de cada cliente

### Ejercicios
- **Catálogo completo** de ejercicios
- **Autocompletado** para búsqueda rápida
- **Gestión CRUD** de ejercicios

### Rutinas
- **Creador de rutinas** con drag & drop
- **Agrupación de ejercicios** por superseries
- **Configuración detallada** (series, repeticiones, peso)
- **Reutilización** de rutinas

## 🔧 Desarrollo

### Estructura de Componentes

Cada dominio sigue una estructura consistente:

```
domain/
├── components/       # Componentes específicos del dominio
├── pages/           # Páginas del dominio
└── index.ts         # Barrel exports
```

### Patrones de Código

#### Importaciones
```typescript
// Componentes del mismo dominio
import { ComponentName } from '../components';

// Componentes de otros dominios
import { ComponentName } from '../../other-domain';

// Componentes compartidos
import { Button, Input } from '../../../shared/components/base';

// Servicios
import { ServiceName } from '../../../services';
```

#### Componentes
```typescript
interface ComponentProps {
  // Props tipadas
}

export const ComponentName: React.FC<ComponentProps> = ({ 
  // Props destructuradas
}) => {
  // Lógica del componente
  
  return (
    // JSX
  );
};
```

### Agregar Nuevas Funcionalidades

1. **Identificar el dominio** apropiado
2. **Crear componentes** en la carpeta correspondiente
3. **Agregar estilos** en `src/styles/`
4. **Actualizar barrel exports** en `index.ts`
5. **Agregar servicios** si es necesario

## 🧪 Testing

```bash
# Ejecutar tests
npm run test

# Tests en modo watch
npm run test:watch

# Coverage de tests
npm run test:coverage
```

## 📱 Responsive Design

La aplicación está optimizada para:
- **Desktop** (1920x1080 y superiores)
- **Laptop** (1366x768 y superiores)
- **Tablet** (768px y superiores)

## 🔒 Seguridad

- **Validación de datos** en frontend y backend
- **Sanitización de inputs** para prevenir XSS
- **Base de datos local** para privacidad de datos
- **Actualizaciones automáticas** a través de Tauri

## 📈 Performance

- **Lazy loading** de componentes
- **Memoización** de componentes pesados
- **Optimización de bundle** con Vite
- **Caching** de datos frecuentemente utilizados

## 🤝 Contribución

1. **Fork** el proyecto
2. **Crear una rama** para tu feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. **Push** a la rama (`git push origin feature/AmazingFeature`)
5. **Abrir un Pull Request**

### Convenciones de Código

- **Nombres de componentes**: PascalCase
- **Nombres de archivos**: PascalCase para componentes, camelCase para utilities
- **Nombres de variables**: camelCase
- **Nombres de constantes**: UPPER_SNAKE_CASE
- **Commits**: Conventional Commits format

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

## 🆘 Soporte

Si encuentras algún problema o tienes preguntas:

1. **Revisa la documentación** en [ARCHITECTURE.md](./ARCHITECTURE.md)
2. **Busca en los issues** existentes
3. **Crea un nuevo issue** con detalles del problema

## 🎉 Agradecimientos

- **Tauri Team** por el excelente framework
- **React Team** por la biblioteca de UI
- **@dnd-kit** por la funcionalidad de drag & drop
- **Vite Team** por las herramientas de desarrollo

---

**¡Desarrollado con ❤️ para la comunidad fitness!**
