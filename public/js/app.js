const API = window.__API_URL__;
let currentSid = null;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

document.addEventListener('DOMContentLoaded', () => {
  loadCaptcha();
  loadDropdowns();
  setupEvents();
});

// --- Captcha ---
async function loadCaptcha() {
  try {
    const res = await fetch(`${API}/captcha`);
    const data = await res.json();
    currentSid = data.sid;
    $('#captcha-img').src = data.captcha;
    $('#captcha-input').value = '';
  } catch (e) {
    console.error('Error cargando captcha:', e);
  }
}

async function refreshCaptcha() {
  try {
    const url = currentSid
      ? `${API}/captcha/refresh?sid=${currentSid}`
      : `${API}/captcha`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.renewed || !currentSid) currentSid = data.sid;
    $('#captcha-img').src = data.captcha;
    $('#captcha-input').value = '';
  } catch (e) {
    console.error('Error refrescando captcha:', e);
  }
}

// --- Dropdowns ---
async function loadDropdowns() {
  try {
    const [tipoColegiado, tipoDocumento] = await Promise.all([
      fetch(`${API}/dropdown/tipos-colegiado`).then(r => r.json()),
      fetch(`${API}/dropdown/tipos-documento`).then(r => r.json())
    ]);

    const selColegiado = $('#tipo-colegiado');
    (Array.isArray(tipoColegiado) ? tipoColegiado : []).forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = item.nombre;
      selColegiado.appendChild(opt);
    });

    const selDocumento = $('#tipo-documento');
    (Array.isArray(tipoDocumento) ? tipoDocumento : []).forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.id;
      opt.textContent = item.nombre;
      selDocumento.appendChild(opt);
    });
  } catch (e) {
    console.error('Error cargando dropdowns:', e);
  }
}

// --- Events ---
function setupEvents() {
  $('#btn-consultar').addEventListener('click', consultar);
  $('#btn-refresh').addEventListener('click', refreshCaptcha);

  $('#buscar-por').addEventListener('change', function () {
    const mode = this.value;
    if (mode === '1') {
      $('.doc-fields').classList.remove('hidden');
      $('.name-fields').classList.remove('active');
    } else {
      $('.doc-fields').classList.add('hidden');
      $('.name-fields').classList.add('active');
    }
  });

  // Enter key en captcha input
  $('#captcha-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') consultar();
  });
}

// --- Consultar ---
async function consultar() {
  const btn = $('#btn-consultar');
  btn.disabled = true;
  btn.textContent = 'Consultando...';
  $('#results-container').innerHTML = '<div class="loading">Buscando...</div>';

  const mode = $('#buscar-por').value;

  const body = {
    sid: currentSid,
    nIdeTipoBusqueda: Number(mode),
    nIdeTipoColegiado: Number($('#tipo-colegiado').value),
    captcha: $('#captcha-input').value
  };

  if (mode === '1') {
    body.nIdeTipoDoc = Number($('#tipo-documento').value);
    body.vNumDoc = $('#nro-documento').value.trim();
  } else {
    body.vPrimerApellido = $('#primer-apellido').value.trim();
    body.vSegundoApellido = $('#segundo-apellido').value.trim();
    body.vNombres = $('#nombres').value.trim();
  }

  try {
    const res = await fetch(`${API}/consulta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();

    if (data.error) {
      $('#results-container').innerHTML = `<div class="error-msg">${data.error}</div>`;
    } else if (data.mensaje && data.codigo !== '0' && (!data.result || data.result.length === 0)) {
      $('#results-container').innerHTML = `<div class="error-msg">${data.mensaje}</div>`;
    } else if (!data.result || data.result.length === 0) {
      $('#results-container').innerHTML = '<div class="no-results">No se encontraron resultados</div>';
    } else {
      renderResults(data.result);
    }
  } catch (e) {
    console.error('Error consulta:', e);
    $('#results-container').innerHTML = '<div class="error-msg">Error al conectar con el servicio</div>';
  }

  btn.disabled = false;
  btn.textContent = 'Consultar';
  refreshCaptcha();
}

// --- Render results ---
function renderResults(results) {
  let html = `
    <table class="results-table">
      <thead>
        <tr>
          <th>#</th>
          <th>CIP</th>
          <th>Apellidos y Nombres</th>
          <th>Especialidad</th>
          <th>Sede</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
  `;

  results.forEach((r, i) => {
    const estado = (r.vEstado || '').toUpperCase();
    const badgeClass = estado === 'HABILITADO' ? 'badge-habilitado' : 'badge-inhabilitado';
    html += `
      <tr>
        <td>${i + 1}</td>
        <td>${r.vRegCip || ''}</td>
        <td>${r.vRazonSocial || ''}</td>
        <td>${r.vEspecialidad || ''}</td>
        <td>${r.vSede || ''}</td>
        <td><span class="${badgeClass}">${estado}</span></td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  $('#results-container').innerHTML = html;
}
