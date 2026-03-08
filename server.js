const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const API_URL = process.env.API_URL || 'https://colegiados.render.org.pe';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.render('index', { apiUrl: API_URL });
});

app.get('/admin', (req, res) => {
  res.render('admin', { apiUrl: API_URL });
});

app.listen(PORT, () => {
  console.log(`Frontend corriendo en puerto ${PORT}`);
});
