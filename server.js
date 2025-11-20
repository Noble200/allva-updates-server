const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8000;

// Habilitar CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// Logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Servir archivos estáticos desde /releases
app.use(express.static(path.join(__dirname, 'releases'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.nupkg')) {
            res.set('Content-Type', 'application/zip');
        }
    }
}));

// Endpoint raíz
app.get('/', (req, res) => {
    res.json({
        service: 'Allva System Updates Server',
        status: 'online',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Listar releases disponibles
app.get('/api/list', (req, res) => {
    const releasesPath = path.join(__dirname, 'releases');
    
    if (!fs.existsSync(releasesPath)) {
        return res.json({ releases: [] });
    }
    
    const files = fs.readdirSync(releasesPath);
    const releaseFiles = files.filter(f => f.endsWith('.nupkg') || f === 'RELEASES');
    
    res.json({ 
        releases: releaseFiles,
        count: releaseFiles.length 
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Allva Updates Server running on port ${PORT}`);
    console.log(`📁 Serving files from: ${path.join(__dirname, 'releases')}`);
    console.log(`🌐 Ready to serve updates!`);
});