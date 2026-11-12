import { Op } from "sequelize";
import { Compra, Comprador, Lote, Especie, Tipo, Pago } from "../models/index.js";
import { fechaISO, rangoDeFechas, fechaLarga, mostrarFecha, dinero } from "../helpers/fechas.js";

// "AAAA-MM-DD" que además sea una fecha real (no 2026-02-31)
const esFecha = (f) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f || "")) return false;
  const d = new Date(`${f}T00:00:00`);
  return !isNaN(d) && fechaISO(d) === f;
};

// Informe de compras de un día (?modo=dia&fecha=) o de un rango de fechas (?modo=rango&desde=&hasta=)
const reporte = async (req, res) => {
  const hoy = fechaISO();
  const modo = req.query.modo === "rango" ? "rango" : "dia";

  let desde, hasta;
  if (modo === "rango") {
    desde = esFecha(req.query.desde) ? req.query.desde : hoy;
    hasta = esFecha(req.query.hasta) ? req.query.hasta : desde;
    if (desde > hasta) [desde, hasta] = [hasta, desde]; // si vienen invertidas, se acomodan
  } else {
    desde = hasta = esFecha(req.query.fecha) ? req.query.fecha : hoy;
  }
  const { inicio, fin } = rangoDeFechas(desde, hasta);

  const compras = await Compra.findAll({
    where: { fecha: { [Op.gte]: inicio, [Op.lt]: fin } },
    order: [["fecha", "ASC"]],
    include: [
      { model: Comprador, as: "comprador" },
      { model: Pago, as: "pago", attributes: ["referencia"] },
      {
        model: Lote,
        as: "lote",
        include: [{ model: Especie, as: "especies", include: [{ model: Tipo, as: "tipo" }] }],
      },
    ],
  });

  const acumular = (t, c) => {
    t.lotes++;
    t.kilos += Number(c.lote.kilos);
    t.cajas += Number(c.lote.numero_cajas);
    t.importe += Number(c.precio_total);
    return t;
  };
  const vacio = (extra) => ({ ...extra, lotes: 0, kilos: 0, cajas: 0, importe: 0 });

  // totales generales, por comprador y por día
  const totales = compras.reduce(acumular, vacio());
  const porComprador = {};
  const porDia = {};
  for (const c of compras) {
    porComprador[c.codigo_cpr] ??= vacio({
      nombre: `${c.comprador.nombre} ${c.comprador.apellido_paterno} ${c.comprador.apellido_materno || ""}`.trim(),
    });
    acumular(porComprador[c.codigo_cpr], c);

    const dia = fechaISO(new Date(c.fecha));
    porDia[dia] ??= vacio({ dia, texto: fechaLarga(dia, { weekday: "short", day: "numeric", month: "short", year: "numeric" }) });
    acumular(porDia[dia], c);
  }

  const unDia = desde === hasta;
  res.render("reportes/reporte", {
    modo,
    desde,
    hasta,
    unDia,
    periodo: unDia
      ? fechaLarga(desde, { dateStyle: "full" })
      : `del ${fechaLarga(desde)} al ${fechaLarga(hasta)}`,
    compras,
    totales,
    porComprador: Object.values(porComprador).sort((x, y) => y.importe - x.importe),
    porDia: Object.values(porDia).sort((x, y) => x.dia.localeCompare(y.dia)),
    generado: mostrarFecha(new Date()),
    mostrarFecha,
    dinero,
  });
};

export { reporte };
