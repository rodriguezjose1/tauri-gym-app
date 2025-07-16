# Configuración del Servidor de Actualizaciones

## 1. Configuración del Servidor

### Opción A: GitHub Releases (Recomendado)

1. **Crear un repositorio para releases**
   ```bash
   # Crear un repositorio público llamado "quality-gym-releases"
   ```

2. **Configurar el endpoint en tauri.conf.json**
   ```json
   "updater": {
     "active": true,
     "endpoints": [
       "https://api.github.com/repos/tu-usuario/quality-gym-releases/releases/latest"
     ],
     "dialog": true,
     "pubkey": "TU_CLAVE_PUBLICA_AQUI"
   }
   ```

3. **Generar clave de firma**
   ```bash
   # Instalar minisign
   cargo install minisign
   
   # Generar par de claves
   minisign -G -p public.key -s secret.key
   
   # La clave pública se usará en tauri.conf.json
   ```

### Opción B: Servidor propio

1. **Crear servidor web simple**
   ```javascript
   // server.js
   const express = require('express');
   const app = express();
   
   app.get('/updates/:platform/:version', (req, res) => {
     const { platform, version } = req.params;
     
     // Lógica para determinar si hay actualización
     const updateInfo = {
       version: "0.1.1",
       notes: "Bug fixes and performance improvements",
       pub_date: "2024-01-15T12:00:00Z",
       platforms: {
         [platform]: {
           signature: "TU_FIRMA_AQUI",
           url: `https://tu-servidor.com/downloads/Quality_GYM_${version}_${platform}.zip`
         }
       }
     };
     
     res.json(updateInfo);
   });
   
   app.listen(3000);
   ```

## 2. Proceso de Build y Release

### Build para producción
```bash
# Build para todas las plataformas
npm run tauri build

# Los archivos se generan en src-tauri/target/release/
```

### Firmar los archivos
```bash
# Para cada archivo generado
minisign -S -s secret.key -m Quality_GYM_0.1.1_x64.dmg
minisign -S -s secret.key -m Quality_GYM_0.1.1_x64-setup.exe
minisign -S -s secret.key -m Quality_GYM_0.1.1_amd64.AppImage
```

### Subir a GitHub Releases
```bash
# Crear release en GitHub
gh release create v0.1.1 \
  --title "Quality GYM v0.1.1" \
  --notes "Bug fixes and performance improvements" \
  Quality_GYM_0.1.1_x64.dmg \
  Quality_GYM_0.1.1_x64-setup.exe \
  Quality_GYM_0.1.1_amd64.AppImage
```

## 3. Configuración del Cliente

### Verificar actualizaciones automáticamente
```javascript
// El componente Updater ya está configurado para:
// - Verificar actualizaciones al iniciar la app
// - Mostrar notificaciones al usuario
// - Descargar e instalar automáticamente
```

### Comandos disponibles
```javascript
// Verificar actualizaciones manualmente
await invoke('check_for_updates');

// Instalar actualización
await invoke('install_update');
```

## 4. Flujo de Actualización

1. **Desarrollo** → Cambios en el código
2. **Build** → `npm run tauri build`
3. **Firma** → Firmar archivos con minisign
4. **Release** → Subir a GitHub Releases
5. **Cliente** → Detecta actualización automáticamente
6. **Usuario** → Recibe notificación y puede instalar

## 5. Consideraciones de Seguridad

- **Firma digital**: Todos los archivos deben estar firmados
- **HTTPS**: El servidor debe usar HTTPS
- **Verificación**: El cliente verifica la firma antes de instalar

## 6. Base de Datos

La base de datos se mantiene en:
- **macOS**: `~/Library/Application Support/QualityGym/`
- **Windows**: `%APPDATA%\QualityGym\`
- **Linux**: `~/.config/quality-gym/`

Los datos del usuario **NO se pierden** durante las actualizaciones.

## 7. Troubleshooting

### Error de firma
```bash
# Regenerar claves
minisign -G -p public.key -s secret.key
# Actualizar pubkey en tauri.conf.json
```

### Error de red
- Verificar conectividad a internet
- Verificar URL del servidor de actualizaciones

### Error de permisos
- Verificar permisos de escritura en directorio de datos
- Verificar permisos de instalación en el sistema 