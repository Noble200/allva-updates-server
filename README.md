# Allva System Updates Server

Servidor para distribución de actualizaciones de Allva System.

## Estructura

```
allva-updates-server/
├── server.js           # Servidor Express
├── package.json        # Dependencias
├── .gitignore         # Archivos ignorados
└── releases/          # Archivos de actualización
    ├── RELEASES       # Metadata de Velopack
    └── *.nupkg        # Paquetes de actualización
```

## Para agregar nuevas versiones

1. Compila tu aplicación:
   ```bash
   dotnet publish -c Release -r win-x64 --self-contained
   ```

2. Crea el instalador con Velopack:
   ```bash
   vpk pack -u AllvaSystem -v X.X.X -p .\bin\Release\net8.0\win-x64\publish -e Allva.Desktop.exe
   ```

3. Copia los archivos generados a la carpeta `releases/`:
   - RELEASES
   - AllvaSystem-X.X.X-full.nupkg

4. Commit y push:
   ```bash
   git add releases/
   git commit -m "Release vX.X.X"
   git push
   ```

5. Railway desplegará automáticamente

## Endpoints

- `GET /` - Info del servidor
- `GET /health` - Health check
- `GET /api/list` - Lista de releases
- `GET /RELEASES` - Metadata de Velopack
- `GET /AllvaSystem-X.X.X-full.nupkg` - Descargar paquete
