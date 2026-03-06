const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8000;
const SERVER_VERSION = '1.2.0';

const GITHUB_OWNER = 'Noble200';
const GITHUB_REPO = 'allva-updates-server';

// Build GitHub Release download URL from filename
// AllvaSystem-1.4.2-full.nupkg -> https://github.com/.../releases/download/v1.4.2/AllvaSystem-1.4.2-full.nupkg
function getGitHubReleaseUrl(filename) {
    const match = filename.match(/^AllvaSystem-(\d+\.\d+\.\d+(?:\.\d+)?)-/);
    if (!match) return null;
    const version = match[1];
    return `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/download/v${version}/${filename}`;
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

// Redirect .nupkg requests to GitHub Releases (bypasses Git LFS)
app.use((req, res, next) => {
    if (!req.path.endsWith('.nupkg')) return next();

    const filename = path.basename(req.path);
    const redirectUrl = getGitHubReleaseUrl(filename);

    if (!redirectUrl) return next();

    console.log(`GitHub Releases redirect: ${filename}`);
    return res.redirect(302, redirectUrl);
});

// Serve static files from /releases (RELEASES, releases.win.json, etc.)
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
        version: SERVER_VERSION,
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
    console.log(`GitHub Releases redirect enabled for .nupkg files`);
});
