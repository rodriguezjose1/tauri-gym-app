# 🧪 CHECKLIST DE TESTING - Tauri Gym App

## 📋 **INSTRUCCIONES**
- ✅ = Completado
- ❌ = Falló
- 🔄 = En progreso
- ⚠️ = Problema encontrado

---

## 🏠 **1. DASHBOARD (Página Principal)**

### **Selección de Persona y Fecha**
- [ ✅ ] Seleccionar una persona del dropdown
- [ ✅ ] Cambiar fecha en el calendario
- [ ✅ ] Ver ejercicios cargados para esa fecha
- [ ✅ ] Ver mensaje cuando no hay ejercicios

### **Modal de Sesión de Entrenamiento**
- [ ✅ ] Abrir modal de sesión
- [ ✅ ] Agregar ejercicios a la sesión
- [ ✅ ] Seleccionar grupo libremente (1-5) para cada ejercicio
- [ ✅ ] Editar ejercicios existentes (sets, reps, peso, notas, grupo)
- [ ✅ ] Eliminar ejercicios de la sesión
- [ ✅ ] Guardar sesión de entrenamiento

### **Validaciones de Grupos Consecutivos - Dashboard**
- [ ✅ ] **Sin ejercicios existentes**: Solo permitir grupo 1 para el primer ejercicio
- [ ✅ ] **Con ejercicios existentes**: Permitir grupos consecutivos
- [ ✅ ] **Mensajes de error específicos**: "⚠️ El primer ejercicio debe estar en el grupo 1"
- [ ✅ ] **Mensajes de error específicos**: "⚠️ No puedes saltar grupos"

### **Cargar Rutinas**
- [ ✅ ] Abrir modal de cargar rutina
- [ ✅ ] Seleccionar rutina del dropdown
- [ ✅ ] Seleccionar fecha para aplicar
- [ ✅ ] Seleccionar grupo inicial
- [ ✅ ] Aplicar rutina a la fecha
- [ ✅ ] Ver mensaje de éxito con detalles

### **Editar Ejercicios Existentes**
- [ ✅ ] Abrir modal de edición
- [ ✅ ] Cambiar grupo de ejercicio
- [ ✅ ] Validar que no rompa consecutividad
- [ ✅ ] Ver mensaje de error específico si rompe reglas

---

## 🏋️ **2. RUTINAS (Gestor de Rutinas)**

### **Crear Rutina**
- [ ✅ ] Abrir modal de crear rutina
- [ ✅  ] Ingresar nombre y código
- [ ✅ ] Crear rutina exitosamente
- [ ✅ ] Ver rutina en la lista

### **Buscar Rutinas**
- [ ✅ ] Buscar por nombre o código
- [ ✅ ] Ver resultados filtrados
- [ ✅ ] Limpiar búsqueda

### **Agregar Ejercicios a Rutina**
- [ ✅ ] Abrir modal de agregar ejercicios
- [ ✅ ] Buscar ejercicios
- [ ✅ ] Seleccionar múltiples ejercicios
- [ ✅ ] Asignar grupos libremente (1-5)
- [ ✅ ] Ver resumen de ejercicios seleccionados
- [ ✅ ] Agregar ejercicios a la rutina

### **Validaciones de Grupos Consecutivos - Rutinas**
- [ ✅ ] **Sin ejercicios en rutina**: Solo permitir grupo 1
- [ ✅ ] **Con ejercicios existentes**: Permitir grupos consecutivos
- [ ✅ ] **Mensajes de error específicos**: Backend bloquea y muestra error claro

### **Editar Ejercicios de Rutina**
- [ ] Cambiar grupo de ejercicio existente
- [ ] Validar consecutividad
- [ ] Ver mensaje de error si rompe reglas

### **Eliminar Rutinas**
- [ ] Eliminar rutina
- [ ] Confirmar eliminación
- [ ] Ver rutina en "Eliminadas"
- [ ] Restaurar rutina eliminada

---

## 🔄 **3. FUNCIONALIDADES CRUZADAS**

### **Validación Consistente**
- [ ] **Dashboard**: Validación al agregar/editar ejercicios
- [ ] **Rutinas**: Validación al agregar/editar ejercicios
- [ ] **Mismos mensajes**: "⚠️ El primer ejercicio debe estar en el grupo 1"
- [ ] **Mismo comportamiento**: Backend bloquea operaciones inválidas

### **Manejo de Errores**
- [ ] **Errores específicos**: Mostrar mensaje del backend
- [ ] **Errores genéricos**: Mostrar mensaje genérico
- [ ] **Duración de notificaciones**: 10 segundos para errores de validación

### **Experiencia de Usuario**
- [ ] **Libertad en frontend**: Seleccionar cualquier grupo (1-5)
- [ ] **Validación en backend**: Bloquear operaciones inválidas
- [ ] **Mensajes claros**: Indicar exactamente qué grupo falta

---

## 🧪 **4. CASOS DE PRUEBA ESPECÍFICOS**

### **Grupos Consecutivos - Dashboard**
- [ ] **Sin ejercicios**: Agregar al grupo 1 ✅, Agregar al grupo 2 ❌
- [ ] **Con grupo 1**: Agregar al grupo 2 ✅, Agregar al grupo 3 ❌
- [ ] **Con grupos 1,2**: Agregar al grupo 3 ✅, Agregar al grupo 4 ❌
- [ ] **Con grupos 1,3**: Agregar al grupo 2 ✅, Agregar al grupo 4 ❌

### **Grupos Consecutivos - Rutinas**
- [ ] **Sin ejercicios**: Agregar al grupo 1 ✅, Agregar al grupo 2 ❌
- [ ] **Con grupo 1**: Agregar al grupo 2 ✅, Agregar al grupo 3 ❌
- [ ] **Con grupos 1,2**: Agregar al grupo 3 ✅, Agregar al grupo 4 ❌

### **Editar Ejercicios**
- [ ] **Mover del grupo 3 al grupo 2**: ✅ (grupos 1,2,2)
- [ ] **Mover del grupo 3 al grupo 1**: ✅ (grupos 1,1,2)
- [ ] **Mover al grupo 4 sin grupo 3**: ❌ (error específico)

### **Cargar Rutinas**
- [ ] **Rutina con grupos consecutivos**: ✅ Cargar exitosamente
- [ ] **Rutina con grupos no consecutivos**: ❌ Error específico

---

## 📱 **5. INTERFAZ DE USUARIO**

### **Responsive Design**
- [ ] Funciona en desktop
- [ ] Funciona en tablet
- [ ] Funciona en móvil

### **Accesibilidad**
- [ ] Navegación por teclado
- [ ] Contraste de colores
- [ ] Mensajes de error claros

### **Performance**
- [ ] Carga rápida de datos
- [ ] Respuesta inmediata a acciones
- [ ] No bloqueos de UI durante operaciones

---

## 🎯 **6. PRIORIDAD DE TESTING**

### **Alta Prioridad**
- [ ] Validación de grupos consecutivos en Dashboard
- [ ] Validación de grupos consecutivos en Rutinas
- [ ] Mensajes de error específicos
- [ ] Editar grupos de ejercicios existentes

### **Media Prioridad**
- [ ] Cargar rutinas al Dashboard
- [ ] Crear y gestionar rutinas
- [ ] Buscar rutinas

### **Baja Prioridad**
- [ ] Eliminar/restaurar rutinas
- [ ] Responsive design
- [ ] Performance

---

## 📝 **NOTAS DE TESTING**

### **Problemas Encontrados**
- [ ] 
- [ ] 
- [ ] 

### **Mejoras Sugeridas**
- [ ] 
- [ ] 
- [ ] 

### **Bugs Reportados**
- [ ] 
- [ ] 
- [ ] 

---

## ✅ **RESUMEN DE COMPLETADO**

**Total de pruebas**: ___ / ___
**Completadas**: ___ / ___
**Fallidas**: ___ / ___
**En progreso**: ___ / ___

**Fecha de testing**: _______________
**Tester**: _______________
**Versión de la app**: _______________

---

*Actualizado: [Fecha]* 