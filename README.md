# Allva System Updates Server

Servidor para distribución de actualizaciones de Allva System.

## Arquitectura

- **Railway**: Sirve los archivos de metadata (`RELEASES`, `releases.win.json`)
- **GitHub Releases**: Almacena los archivos `.nupkg` (sin límite LFS)
- Los `.nupkg` son redirigidos automáticamente por el servidor a GitHub Releases

## Estructura

```
allva-updates-server/
├── server.js           # Servidor Express (redirect a GitHub Releases)
├── package.json        # Dependencias
└── releases/          # Archivos de metadata
    ├── RELEASES            # Metadata Squirrel/Velopack
    ├── releases.win.json   # Metadata Velopack v2
    └── *.nupkg             # Solo LFS pointers (el servidor redirige a GitHub Releases)
```

## Para agregar una nueva versión

1. Compila y genera los paquetes con Velopack:
   ```bash
   vpk pack -u AllvaSystem -v X.X.X -p .\bin\Release\net8.0\win-x64\publish -e Allva.Desktop.exe
   ```

2. Copia los archivos de metadata a `releases/`:
   - `RELEASES`
   - `releases.win.json`
   - `AllvaSystem-X.X.X-full.nupkg`

3. **Crea el GitHub Release y sube el .nupkg:**
   ```bash
   gh release create vX.X.X --repo Noble200/allva-updates-server --title "vX.X.X" --notes "Release X.X.X" releases/AllvaSystem-X.X.X-full.nupkg
   ```

4. Commit y push (metadata + nupkg pointer):
   ```bash
   git add releases/
   git commit -m "V X.X.X"
   git push
   ```

5. Railway desplegará automáticamente

## Endpoints

- `GET /` - Info del servidor
- `GET /health` - Health check
- `GET /api/list` - Lista de releases
- `GET /RELEASES` - Metadata Velopack (Squirrel)
- `GET /releases.win.json` - Metadata Velopack v2
- `GET /AllvaSystem-X.X.X-full.nupkg` - Redirige a GitHub Releases para descargar

## Cómo funciona la descarga

```
App cliente
   → solicita AllvaSystem-1.4.2-full.nupkg al servidor Railway
   → servidor responde 302 redirect a:
      https://github.com/Noble200/allva-updates-server/releases/download/v1.4.2/AllvaSystem-1.4.2-full.nupkg
   → app descarga directo desde GitHub Releases (sin cuota LFS)
```
