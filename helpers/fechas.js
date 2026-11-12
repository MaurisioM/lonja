const dos = (n) => String(n).padStart(2, "0");

// "2026-10-30" (fecha local)
const fechaISO = (d = new Date()) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;

// valor para <input type="datetime-local">: "2026-10-30T14:05"
const valorDatetimeLocal = (d = new Date()) => {
  d = new Date(d);
  if (isNaN(d)) return "";
  return `${fechaISO(d)}T${dos(d.getHours())}:${dos(d.getMinutes())}`;
};

// rango [inicio, fin) de un día "AAAA-MM-DD"
const rangoDelDia = (fecha) => {
  const inicio = new Date(`${fecha}T00:00:00`);
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + 1);
  return { inicio, fin };
};

const mostrarFecha = (d) =>
  new Date(d).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });

const dinero = (n) =>
  Number(n).toLocaleString("es-MX", { style: "currency", currency: "MXN" });

export { fechaISO, valorDatetimeLocal, rangoDelDia, mostrarFecha, dinero };

// rango [inicio, fin) que va del inicio de "desde" al final de "hasta" (ambos "AAAA-MM-DD", inclusivos)
const rangoDeFechas = (desde, hasta) => ({
  inicio: rangoDelDia(desde).inicio,
  fin: rangoDelDia(hasta).fin,
});

// "12 de noviembre de 2026"
const fechaLarga = (fecha, opciones = { dateStyle: "long" }) => {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-MX", opciones);
};

export { rangoDeFechas, fechaLarga };
