const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_URL = process.env.API_URL || 'https://colegiados.render.org.pe';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Loading animation ruta CIP
app.get('/e/images/loading-bars.gif', (req, res) => {
  res.type('image/svg+xml');
  res.sendFile(path.join(__dirname, 'public', 'images', 'loading-bars.svg'));
});

// Ruta principal CIP
app.get('/sicecolegiacionweb/externo/consultaCol/', (req, res) => {
  res.render('index', { apiUrl: API_URL, prefillCip: '', prefillTipo: '' });
});

// Ruta con auto-fill: /sicecolegiacionweb/externo/consultaCol/291951&11
app.get('/sicecolegiacionweb/externo/consultaCol/:params', (req, res) => {
  const raw = req.params.params;
  const parts = raw.split('&');
  const prefillCip = parts[0] || '';
  const prefillTipo = parts[1] || '';
  res.render('index', { apiUrl: API_URL, prefillCip, prefillTipo });
});

// Redirect root to CIP path
app.get('/', (req, res) => {
  res.redirect('/sicecolegiacionweb/externo/consultaCol/');
});

// Admin panel
app.get('/admin', (req, res) => {
  res.render('admin', { apiUrl: API_URL });
});

app.listen(PORT, () => {
  console.log(`Frontend corriendo en puerto ${PORT}`);
});
