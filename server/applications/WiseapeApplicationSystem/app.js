const express = require('express');
const cors = require('cors');
const routes = require('./src/routes');
const { UPLOAD_DIR } = require('./src/services/uploadsService');

const port = process.env.PORT || 4000;

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOAD_DIR));
app.use('/', routes);

app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error('[WAS API] Unhandled error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(port, () => {
  console.log(`Wiseape Application System REST API running on http://localhost:${port}`);
});
