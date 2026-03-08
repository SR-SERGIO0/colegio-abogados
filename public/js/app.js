const API = window.__API_URL__;
let currentSid = null;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

document.addEventListener('DOMContentLoaded', () => {
  loadCaptcha();
  setupEvents();
  handlePrefill();
});

// --- Prefill from URL ---
function handlePrefill() {
  const cip = window.__PREFILL_CIP__;
  const tipo = window.__PREFILL_TIPO__;

  if (cip) {
    $('#nro-documento').value = cip;
    // Set tipo documento to Reg. CIP
    $('#tipo-documento').value = '4612';
  }
  if (tipo) {
    // Map tipo number to tipo_colegiado value
    const tipoMap = { '11': '5348', '13': '5350' };
    const mapped = tipoMap[tipo] || tipo;
    const sel = $('#tipo-colegiado');
    for (let i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === mapped) {
        sel.selectedIndex = i;
        break;
      }
    }
  }
}

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
    currentSid = data.sid;
    $('#captcha-img').src = data.captcha;
    $('#captcha-input').value = '';
  } catch (e) {
    console.error('Error refrescando captcha:', e);
  }
}

// --- Events ---
function setupEvents() {
  $('#btn-consultar').addEventListener('click', consultar);
  $('#btn-refresh').addEventListener('click', refreshCaptcha);

  $('#buscar-por').addEventListener('change', function () {
    if (this.value === '1') {
      $('#doc-fields').style.display = 'flex';
      $('#name-fields').style.display = 'none';
    } else {
      $('#doc-fields').style.display = 'none';
      $('#name-fields').style.display = 'flex';
    }
  });

  $('#captcha-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') consultar();
  });

  // Close modal on overlay click
  $('#detail-overlay').addEventListener('click', (e) => {
    if (e.target === $('#detail-overlay')) closeModal();
  });
}

// --- Consultar ---
async function consultar() {
  const btn = $('#btn-consultar');
  btn.disabled = true;
  btn.textContent = 'Consultando...';

  const mode = $('#buscar-por').value;
  const body = {
    sid: currentSid,
    nIdeTipoBusqueda: Number(mode),
    nIdeTipoColegiado: Number($('#tipo-colegiado').value) || '',
    captcha: $('#captcha-input').value.trim()
  };

  if (mode === '1') {
    body.nIdeTipoDoc = Number($('#tipo-documento').value);
    body.vNumDoc = $('#nro-documento').value.trim();
  } else {
    body.vPrimerApellido = $('#primer-apellido').value.trim().toUpperCase();
    body.vSegundoApellido = $('#segundo-apellido').value.trim().toUpperCase();
    body.vNombres = $('#nombres').value.trim().toUpperCase();
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
    } else if (data.codigo === '1') {
      $('#results-container').innerHTML = `<div class="error-msg">${data.mensaje || 'Captcha incorrecto'}</div>`;
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

// --- Render results (CIP style table) ---
function renderResults(results) {
  let html = `<div class="results-wrapper">
    <table class="results-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Ver Detalle</th>
          <th>CIP <span class="sort-icon">&#9660;</span></th>
          <th>Apellidos y Nombres <span class="sort-icon">&#9660;</span></th>
          <th>Especialidad <span class="sort-icon">&#9660;</span></th>
          <th>Sede <span class="sort-icon">&#9660;</span></th>
          <th>Estado del Registro <span class="sort-icon">&#9660;</span></th>
        </tr>
      </thead>
      <tbody>`;

  results.forEach((r, i) => {
    html += `
      <tr>
        <td>${i + 1}</td>
        <td><button class="btn-lupa" onclick="openDetail(${r.nIdePadronCol})" title="Ver detalle">&#128269;</button></td>
        <td><span class="cip-link">${r.vRegCip || ''}</span></td>
        <td>${r.vRazonSocial || ''}</td>
        <td>${r.vEspecialidad || ''}</td>
        <td>${r.vSede || ''}</td>
        <td>${r.vEstado || ''}</td>
      </tr>`;
  });

  html += `</tbody></table>
    <div class="results-scroll">
      <button class="scroll-arrow">&#9664;</button>
      <span></span>
      <button class="scroll-arrow">&#9654;</button>
    </div>
  </div>`;

  $('#results-container').innerHTML = html;
}

// --- Modal detalle ---
function openDetail(id) {
  const overlay = $('#detail-overlay');
  const body = $('#modal-body');
  overlay.style.display = 'flex';
  body.innerHTML = '<div class="modal-loading"><img src="/e/images/loading-bars.gif" alt="Cargando..."></div>';

  fetch(`${API}/detalle/${id}`)
    .then(r => r.json())
    .then(data => {
      if (data.error) {
        body.innerHTML = `<div class="error-msg">${data.error}</div>`;
        return;
      }
      renderDetail(data);
    })
    .catch(e => {
      body.innerHTML = '<div class="error-msg">Error al cargar detalle</div>';
    });
}

function renderDetail(d) {
  const fotoHtml = d.fotoUrl
    ? `<img src="${d.fotoUrl}" alt="Foto">`
    : `<div class="no-photo">Sin foto</div>`;

  $('#modal-body').innerHTML = `
    <div class="detail-content">
      <div class="detail-info">
        <table>
          <tr><td>Numero CIP</td><td>: ${d.numeroCip}</td></tr>
          <tr><td>Primer Apellido</td><td>: ${d.primerApellido}</td></tr>
          <tr><td>Segundo Apellido</td><td>: ${d.segundoApellido}</td></tr>
          <tr><td>Nombres</td><td>: ${d.nombres}</td></tr>
          <tr><td>Sede</td><td>: ${d.sede}</td></tr>
          <tr><td>Condici&oacute;n</td><td>: ${d.condicion}</td></tr>
          <tr><td>Fecha Incorporaci&oacute;n</td><td>: ${d.fechaIncorporacion}</td></tr>
        </table>
      </div>
      <div class="detail-photo">
        ${fotoHtml}
      </div>
    </div>

    <div class="formacion-section">
      <div class="formacion-title">Formaci&oacute;n Acad&eacute;mica</div>
      <div class="formacion-subtitle">PRIMERA ESPECIALIDAD</div>
      <table class="formacion-table">
        <thead>
          <tr>
            <th>Capitulo</th>
            <th>Especialidad</th>
            <th>Fecha Reconocimiento CIP</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${d.formacionAcademica.capitulo}</td>
            <td>${d.formacionAcademica.especialidad}</td>
            <td>${d.formacionAcademica.fechaReconocimiento}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <button class="btn-cerrar" onclick="closeModal()">Cerrar</button>
    <div style="clear:both"></div>
  `;
}

function closeModal() {
  $('#detail-overlay').style.display = 'none';
}
