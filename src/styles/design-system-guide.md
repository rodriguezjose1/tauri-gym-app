# Sistema de Diseño - Guía Simple

## Variables CSS Disponibles

### Espaciado (Basado en grid de 8px)
- `--space-xs`: 4px
- `--space-sm`: 8px  
- `--space-md`: 16px
- `--space-lg`: 24px
- `--space-xl`: 32px
- `--space-2xl`: 48px

### Tamaños de Fuente
- `--text-xs`: 12px (11px en móvil)
- `--text-sm`: 14px (13px en móvil)
- `--text-md`: 16px (14px en móvil)
- `--text-lg`: 18px (16px en móvil)
- `--text-xl`: 20px
- `--text-2xl`: 24px

### Alturas de Componentes
- `--height-sm`: 36px
- `--height-md`: 48px (44px en móvil)
- `--height-lg`: 56px (48px en móvil)

### Border Radius
- `--radius-sm`: 4px
- `--radius-md`: 8px
- `--radius-lg`: 12px

## Reglas de Uso

### 1. Usar Variables CSS
❌ Mal:
```css
padding: 16px;
font-size: 14px;
```

✅ Bien:
```css
padding: var(--space-md);
font-size: var(--text-sm);
```

### 2. Espaciado Consistente
- Usar siempre múltiplos de 4px
- Preferir `--space-md` (16px) para espaciado general
- Usar `--space-sm` (8px) para espaciado pequeño
- Usar `--space-lg` (24px) para espaciado grande

### 3. Tamaños de Fuente
- Títulos: `--text-lg` o `--text-xl`
- Texto normal: `--text-md`
- Texto pequeño: `--text-sm`
- Texto muy pequeño: `--text-xs`

### 4. Alturas de Componentes
- Botones normales: `--height-md`
- Botones grandes: `--height-lg`
- Inputs: `--height-md`

## Plan de Migración

### Fase 1 ✅ - Variables CSS
- [x] Crear variables CSS
- [x] Actualizar Button.css
- [x] Importar en index.css

### Fase 2 - Componentes Base
- [ ] Actualizar Select.css
- [ ] Actualizar Card.css
- [ ] Actualizar Title.css

### Fase 3 - Páginas
- [ ] Actualizar Dashboard.css
- [ ] Actualizar WeeklyCalendar.css
- [ ] Actualizar RoutineManager.css

### Fase 4 - Revisión
- [ ] Revisar consistencia visual
- [ ] Ajustar variables si es necesario
- [ ] Documentar casos especiales 