const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8000;

const GITHUB_LFS_BATCH_URL = 'https://github.com/Noble200/allva-updates-server.git/info/lfs/objects/batch';

// Parse Git LFS pointer file content
function parseLfsPointer(content) {
    if (!content.startsWith('version https://git-lfs.github.com/spec/v1')) {
        return null;
    }
    const lines = content.split('\n');
    let oid = null, size = null;
    for (const line of lines) {
        if (line.startsWith('oid sha256:')) {
            oid = line.replace('oid sha256:', '').trim();
        } else if (line.startsWith('size ')) {
            size = parseInt(line.replace('size ', '').trim());
        }
    }
    return oid && size ? { oid, size } : null;
}

// Get download URL from GitHub LFS API
async function getLfsDownloadUrl(oid, size) {
    const response = await fetch(GITHUB_LFS_BATCH_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/vnd.git-lfs+json',
            'Accept': 'application/vnd.git-lfs+json'
        },
        body: JSON.stringify({
            operation: 'download',
            transfers: ['basic'],
            objects: [{ oid, size }]
        })
    });
    const data = await response.json();
    if (data.objects && data.objects[0] && data.objects[0].actions) {
        return data.objects[0].actions.download.href;
    }
    return null;
}

// CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// Logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// LFS resolver middleware - intercept .nupkg requests
app.use(async (req, res, next) => {
    if (!req.path.endsWith('.nupkg')) {
        return next();
    }

    const filePath = path.join(__dirname, 'releases', req.path);

    try {
        if (!fs.existsSync(filePath)) {
            return next();
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const lfsPointer = parseLfsPointer(content);

        if (!lfsPointer) {
            return next();
        }

        console.log(`LFS redirect: ${req.path} (${(lfsPointer.size / 1024 / 1024).toFixed(1)} MB)`);

        const downloadUrl = await getLfsDownloadUrl(lfsPointer.oid, lfsPointer.size);

        if (downloadUrl) {
            return res.redirect(302, downloadUrl);
        } else {
            console.error(`Failed to resolve LFS URL for ${req.path}`);
            return res.status(500).json({ error: 'Failed to resolve LFS file' });
        }
    } catch (err) {
        // If readFileSync fails (binary file, not LFS pointer), serve normally
        return next();
    }
});

// Serve static files from /releases
app.use(express.static(path.join(__dirname, 'releases'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.nupkg')) {
            res.set('Content-Type', 'application/zip');
        }
    }
}));

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        service: 'Allva System Updates Server',
        status: 'online',
        version: '1.1.0',
        timestamp: new Date().toISOString()
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// List releases
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
    console.log(`Allva Updates Server running on port ${PORT}`);
    console.log(`Serving files from: ${path.join(__dirname, 'releases')}`);
    console.log(`LFS redirect enabled for .nupkg files`);
});
