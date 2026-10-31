import { check, validationResult } from "express-validator";
import fs from "fs/promises";
import db from "../config/db.js";
import { Lote, Especie, Tipo, Compra } from "../models/index.js";
import { valorDatetimeLocal } from "../helpers/fechas.js";

const formulario = (res, lote, action, errores = null) =>
  res.render("lotes/formulario", { lote, action, method: "POST", errores, valorDatetimeLocal });

const inicio = async (req, res) => {
  const lotes = await Lote.findAll({
    order: [["id_lte", "DESC"]],
    include: [
      { model: Especie, as: "especies", include: [{ model: Tipo, as: "tipo" }] },
      { model: Compra, as: "compra" },
    ],
  });
  res.render("lotes/index", { lotes });
};

const verCrear = (req, res) => formulario(res, null, "/lotes/registrar");

async function validar(req) {
  await check("kilos").isFloat({ gt: 0 }).withMessage("Los kilos deben ser un número mayor a 0").run(req);
  await check("numero_cajas").isInt({ min: 1, max: 32767 }).withMessage("El número de cajas debe ser un entero entre 1 y 32767").run(req);
  await check("precio_kilo_salida").isFloat({ gt: 0 }).withMessage("El precio de salida por kilo debe ser mayor a 0").run(req);
  await check("fecha").isISO8601().withMessage("La fecha no es válida").run(req);
  return validationResult(req);
}

const datos = (body) => ({
  kilos: body.kilos,
  numero_cajas: body.numero_cajas,
  precio_kilo_salida: body.precio_kilo_salida,
  fecha: new Date(body.fecha),
});

const registro = async (req, res) => {
  const valido = await validar(req);
  if (!valido.isEmpty()) return formulario(res, req.body, "/lotes/registrar", valido.array());
  const lote = await Lote.create(datos(req.body));
  // después de crear el lote, lo normal es agregarle sus especies
  res.redirect(`/especies/crear?lote=${lote.id_lte}&ok=Lote ${lote.id_lte} registrado, ahora agrega sus especies`);
};

const editar = async (req, res) => {
  const lote = await Lote.findByPk(req.params.id);
  if (!lote) return res.redirect("/lotes/ver");
  formulario(res, lote, `/lotes/${lote.id_lte}?_method=PUT`);
};

const actualizar = async (req, res) => {
  const lote = await Lote.findByPk(req.params.id, { include: [{ model: Compra, as: "compra" }] });
  if (!lote) return res.redirect("/lotes/ver");
  const valido = await validar(req);
  if (!valido.isEmpty()) {
    return formulario(res, { ...req.body, id_lte: lote.id_lte }, `/lotes/${lote.id_lte}?_method=PUT`, valido.array());
  }
  await db.transaction(async (t) => {
    await lote.update(datos(req.body), { transaction: t });
    // si el lote ya se vendió, el total depende de los kilos: se recalcula
    if (lote.compra) {
      const total = (Number(lote.kilos) * Number(lote.compra.precio_kilo_final)).toFixed(2);
      await lote.compra.update({ precio_total: total }, { transaction: t });
    }
  });
  res.redirect("/lotes/ver?ok=Lote actualizado");
};

const eliminar = async (req, res) => {
  const lote = await Lote.findByPk(req.params.id, {
    include: [{ model: Compra, as: "compra" }, { model: Especie, as: "especies" }],
  });
  if (!lote) return res.redirect("/lotes/ver");
  if (lote.compra) {
    return res.redirect("/lotes/ver?aviso=No se puede eliminar: el lote ya fue comprado. Elimina primero la compra");
  }
  await db.transaction(async (t) => {
    await Especie.destroy({ where: { id_lte: lote.id_lte }, transaction: t });
    await lote.destroy({ transaction: t });
  });
  for (const e of lote.especies) {
    if (e.imagen) await fs.unlink(`public/img/especies/${e.imagen}`).catch(() => {});
  }
  res.redirect("/lotes/ver?ok=Lote eliminado");
};

export { inicio, verCrear, registro, editar, actualizar, eliminar };
