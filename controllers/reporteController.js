import { Op } from "sequelize";
import { Compra, Comprador, Lote, Especie, Tipo } from "../models/index.js";
import { fechaISO, rangoDelDia, mostrarFecha, dinero } from "../helpers/fechas.js";

// Informe diario con el detalle de las compras de un día
const diario = async (req, res) => {
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(req.query.fecha || "") ? req.query.fecha : fechaISO();
  const { inicio, fin } = rangoDelDia(fecha);

  const compras = await Compra.findAll({
    where: { fecha: { [Op.gte]: inicio, [Op.lt]: fin } },
    order: [["fecha", "ASC"]],
    include: [
      { model: Comprador, as: "comprador" },
      {
        model: Lote,
        as: "lote",
        include: [{ model: Especie, as: "especies", include: [{ model: Tipo, as: "tipo" }] }],
      },
    ],
  });

  // totales generales
  const totales = compras.reduce(
    (t, c) => ({
      kilos: t.kilos + Number(c.lote.kilos),
      cajas: t.cajas + Number(c.lote.numero_cajas),
      importe: t.importe + Number(c.precio_total),
    }),
    { kilos: 0, cajas: 0, importe: 0 }
  );

  // resumen por comprador
  const porComprador = {};
  for (const c of compras) {
    const k = c.codigo_cpr;
    porComprador[k] ??= {
      nombre: `${c.comprador.nombre} ${c.comprador.apellido_paterno} ${c.comprador.apellido_materno || ""}`.trim(),
      lotes: 0,
      kilos: 0,
      importe: 0,
    };
    porComprador[k].lotes++;
    porComprador[k].kilos += Number(c.lote.kilos);
    porComprador[k].importe += Number(c.precio_total);
  }

  const [a, m, d] = fecha.split("-").map(Number);
  const fechaLarga = new Date(a, m - 1, d).toLocaleDateString("es-MX", { dateStyle: "full" });

  res.render("reportes/diario", {
    fecha,
    fechaLarga,
    compras,
    totales,
    porComprador: Object.values(porComprador).sort((x, y) => y.importe - x.importe),
    generado: mostrarFecha(new Date()),
    mostrarFecha,
    dinero,
  });
};

export { diario };
