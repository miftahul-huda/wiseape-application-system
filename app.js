const express = require('express');
const path = require('path');
const fs = require('fs');
const WiseApplicationSystem = require('./system/WiseApplicationSystem');

const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');
const ALLOWED_IMAGE_TYPES = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

async function start() {
  const system = new WiseApplicationSystem();
  await system.run();

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const app = express();
  const port = process.env.PORT || 3000;

  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/WiseDesktop.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'system', 'WiseDesktop.js'));
  });

  app.get('/WiseApplicationSystem.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'system', 'WiseApplicationSystem.js'));
  });

  app.get('/controls/:file', (req, res) => {
    if (!/^Wise[A-Za-z]+\.js$/.test(req.params.file)) {
      return res.status(404).end();
    }
    return res.sendFile(path.join(__dirname, 'system', 'controls', req.params.file));
  });

  app.get('/api/system', (req, res) => {
    res.json(system.getSystemSnapshot());
  });

  app.get('/api/apps', (req, res) => {
    res.json(system.getSystemSnapshot().apps);
  });

  app.get('/api/themes', (req, res) => {
    res.json({
      themes: system.themes,
      activeThemeId: system.activeThemeId,
      backgroundImage: system.backgroundImage,
    });
  });

  app.post('/api/uploads', express.raw({ limit: '10mb', type: () => true }), (req, res) => {
    const contentType = req.headers['content-type'];
    const extension = ALLOWED_IMAGE_TYPES[contentType];
    if (!extension) {
      return res.status(400).json({ error: 'Only PNG, JPEG, GIF, or WEBP images are allowed' });
    }

    const filename = `bg-${Date.now()}-${Math.random().toString(16).slice(2)}${extension}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, filename), req.body);

    return res.json({ url: `/uploads/${filename}` });
  });

  app.post('/api/applications/run', async (req, res) => {
    try {
      const { appId } = req.body || {};
      if (!appId) {
        return res.status(400).json({ error: 'appId is required' });
      }

      const result = await system.runApplication(appId);
      return res.json(result);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/applications/:appId/events', async (req, res) => {
    try {
      const { appId } = req.params;
      const { controlId, event, values } = req.body || {};
      if (!controlId) {
        return res.status(400).json({ error: 'controlId is required' });
      }

      const result = system.dispatchControlEvent(appId, controlId, event || 'click', values || {});
      return res.json(result);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  app.listen(port, () => {
    console.log(`Wiseape Application System running on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start Wiseape Application System:', error);
  process.exit(1);
});
