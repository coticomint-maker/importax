/**
 * IMPORTAX · Hojas de control (Google Sheets + Apps Script)
 * Pega este código en Extensiones > Apps Script de una hoja nueva.
 * Luego: Implementar > Nueva implementación > Aplicación web
 *        Ejecutar como: Yo · Quién tiene acceso: Cualquier persona
 * Copia la URL que termina en /exec y pégala en CONFIG.SHEETS_URL de index.html.
 */
const HOJAS = {
  visita:      ["Fecha", "UID", "Canal"],
  calculo:     ["Fecha", "UID", "Canal", "FOB (USD)", "Litros", "Régimen", "Total (Bs)"],
  encuesta:    ["Fecha", "UID", "Canal", "Estrellas", "Comentario"],
  instalacion: ["Fecha", "UID", "Canal"]
};

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const d = JSON.parse(e.postData.contents);
    const ev = String(d.evento || "");
    if (!HOJAS[ev]) return salida("evento desconocido");
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let h = ss.getSheetByName(ev);
    if (!h) {
      h = ss.insertSheet(ev);
      h.appendRow(HOJAS[ev]);
      h.setFrozenRows(1);
      h.getRange(1, 1, 1, HOJAS[ev].length).setBackground("#07182E").setFontColor("#FFFFFF").setFontWeight("bold");
    }
    const base = [new Date(), limpia(d.uid, 20), limpia(d.app, 12)];
    let fila;
    if (ev === "calculo")  fila = base.concat([num(d.fob), num(d.litros), limpia(d.origen, 10), num(d.total_bs)]);
    else if (ev === "encuesta") fila = base.concat([Math.min(5, Math.max(1, num(d.estrellas))), limpia(d.comentario, 300)]);
    else fila = base;
    h.appendRow(fila);
    return salida("ok");
  } catch (err) {
    return salida("error");
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

function doGet() { return salida("IMPORTAX activo"); }

// Evita inyección de fórmulas (=, +, -, @) y limita el largo del texto.
function limpia(v, max) {
  let s = String(v == null ? "" : v).slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}
function num(v) { const n = Number(v); return isFinite(n) ? n : 0; }
function salida(t) { return ContentService.createTextOutput(t); }

/** Ejecuta UNA vez a mano: crea la hoja "Panel" con indicadores en vivo. */
function crearPanel() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ["visita", "calculo", "encuesta", "instalacion"].forEach(n => {
    if (!ss.getSheetByName(n)) { const h = ss.insertSheet(n); h.appendRow(HOJAS[n]); h.setFrozenRows(1); }
  });
  let p = ss.getSheetByName("Panel") || ss.insertSheet("Panel", 0);
  p.clear();
  const filas = [
    ["IMPORTAX · Panel de control", ""],
    ["Visitas totales", "=COUNTA(visita!A2:A)"],
    ["Usuarios únicos", "=IFERROR(COUNTA(UNIQUE(visita!B2:B)),0)"],
    ["Cálculos realizados", "=COUNTA(calculo!A2:A)"],
    ["Instalaciones de la app", "=COUNTA(instalacion!A2:A)"],
    ["Opiniones recibidas", "=COUNTA(encuesta!A2:A)"],
    ["Calificación promedio (1-5)", "=IFERROR(ROUND(AVERAGE(encuesta!D2:D),2),\"—\")"],
    ["Cálculos con preferencia ACE", "=COUNTIF(calculo!F2:F,\"ace\")"],
    ["Cálculos con arancel general", "=COUNTIF(calculo!F2:F,\"gen\")"],
    ["Costo total promedio (Bs)", "=IFERROR(ROUND(AVERAGE(calculo!G2:G),2),\"—\")"],
    ["Litros promedio por cálculo", "=IFERROR(ROUND(AVERAGE(calculo!E2:E),1),\"—\")"],
    ["Usos hoy", "=COUNTIFS(calculo!A2:A,\">=\"&TODAY())"]
  ];
  p.getRange(1, 1, filas.length, 2).setValues(filas);
  p.getRange("A1:B1").merge().setBackground("#8E1236").setFontColor("#FFFFFF").setFontWeight("bold").setFontSize(14);
  p.getRange("A2:A12").setFontWeight("bold");
  p.getRange("B2:B12").setHorizontalAlignment("right").setBackground("#F7F8FA");
  p.setColumnWidth(1, 280); p.setColumnWidth(2, 140);
  const g = p.newChart().setChartType(Charts.ChartType.COLUMN)
    .addRange(p.getRange("A8:B9")).setPosition(2, 4, 0, 0)
    .setOption("title", "Régimen usado en los cálculos").setOption("legend", {position: "none"}).build();
  p.insertChart(g);
}
