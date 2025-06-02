# UI Components Library

Una biblioteca de componentes reutilizables para tu aplicación React con TypeScript.

## 📦 Componentes Disponibles

### Button
Botón versátil con múltiples variantes y estados.

```tsx
import { Button } from './components/ui';

// Variantes
<Button variant="primary">Primario</Button>
<Button variant="secondary">Secundario</Button>
<Button variant="success">Éxito</Button>
<Button variant="danger">Peligro</Button>

// Tamaños
<Button size="sm">Pequeño</Button>
<Button size="md">Mediano</Button>
<Button size="lg">Grande</Button>

// Estados
<Button loading>Cargando...</Button>
<Button disabled>Deshabilitado</Button>
<Button fullWidth>Ancho completo</Button>
```

### Input
Campo de texto con etiquetas, iconos y validación.

```tsx
import { Input } from './components/ui';

// Básico
<Input label="Nombre" placeholder="Tu nombre" />

// Con iconos
<Input 
  label="Email" 
  leftIcon="📧" 
  placeholder="tu@email.com" 
/>

// Con validación
<Input 
  label="Contraseña"
  type="password"
  error="La contraseña es muy corta"
  helperText="Mínimo 8 caracteres"
/>

// Variantes
<Input variant="primary" />
<Input variant="success" />
```

### Title
Títulos semánticos con diferentes estilos.

```tsx
import { Title } from './components/ui';

// Niveles semánticos
<Title level={1}>Título Principal</Title>
<Title level={2}>Subtítulo</Title>

// Variantes de color
<Title variant="primary">Azul</Title>
<Title variant="success">Verde</Title>
<Title variant="danger">Rojo</Title>

// Personalización
<Title 
  level={2} 
  size="3xl" 
  weight="bold" 
  align="center"
>
  Título Personalizado
</Title>
```

### Card
Contenedor versátil para agrupar contenido.

```tsx
import { Card } from './components/ui';

// Variantes
<Card variant="default">Contenido</Card>
<Card variant="elevated">Con sombra</Card>
<Card variant="outlined">Con borde</Card>

// Padding
<Card padding="sm">Poco espacio</Card>
<Card padding="md">Espacio medio</Card>
<Card padding="lg">Mucho espacio</Card>

// Interactivo
<Card hoverable onClick={() => console.log('Click!')}>
  Tarjeta clickeable
</Card>
```

### Modal
Diálogo modal con overlay y animaciones.

```tsx
import { Modal } from './components/ui';

const [isOpen, setIsOpen] = useState(false);

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Mi Modal"
  size="md"
>
  <p>Contenido del modal</p>
</Modal>
```

## 🎨 Sistema de Diseño

### Colores
- **Primary**: `#2563eb` (Azul)
- **Success**: `#059669` (Verde)
- **Danger**: `#dc2626` (Rojo)
- **Secondary**: `#6b7280` (Gris)

### Espaciado
- **sm**: 8-12px
- **md**: 16-20px
- **lg**: 24-32px

### Tipografía
- **Tamaños**: xs, sm, md, lg, xl, 2xl, 3xl
- **Pesos**: normal, medium, semibold, bold

## 📱 Responsive Design

Todos los componentes están optimizados para dispositivos móviles:
- Breakpoints: 640px, 768px
- Tamaños de fuente adaptativos
- Espaciado responsive
- Touch-friendly (44px mínimo para botones)

## 🚀 Uso Rápido

```tsx
// Importar componentes individuales
import { Button, Input, Title } from './components/ui';

// O importar todo
import * as UI from './components/ui';

function MyComponent() {
  return (
    <UI.Card variant="elevated" padding="lg">
      <UI.Title level={2} variant="primary">
        Mi Formulario
      </UI.Title>
      
      <UI.Input 
        label="Nombre" 
        placeholder="Tu nombre"
        variant="primary"
      />
      
      <UI.Button variant="primary" fullWidth>
        Enviar
      </UI.Button>
    </UI.Card>
  );
}
```

## 🔧 Personalización

Cada componente acepta una prop `className` para personalización adicional:

```tsx
<Button className="mi-clase-personalizada" variant="primary">
  Botón personalizado
</Button>
```

## 📋 Props Comunes

### Todas las props HTML nativas son soportadas
- `onClick`, `onFocus`, `onBlur`, etc.
- `id`, `data-*`, `aria-*`, etc.
- `style` (aunque se recomienda usar `className`)

### Props de accesibilidad incluidas
- Labels automáticos para inputs
- ARIA attributes apropiados
- Navegación por teclado
- Focus management en modales

## 🎯 Ejemplos Completos

Ver `ComponentShowcase.tsx` para ejemplos interactivos de todos los componentes.

## 🔄 Actualizaciones Futuras

Componentes planeados:
- Select/Dropdown
- Checkbox/Radio
- Toast/Notification
- Tabs
- Accordion
- Table
- Pagination 