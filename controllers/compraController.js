import { Op } from "sequelize";
import { check, validationResult } from "express-validator";
import { Compra, Comprador, Lote, Especie, Carrito, Pago } from "../models/index.js";
import { valorDatetimeLocal, rangoDelDia, mostrarFecha, dinero } from "../helpers/fechas.js";
import { limpiarVencidos } from "../helpers/carrito.js";

// lotes que todavía no se han comprado ni están apartados en el carrito de un
// comprador en línea (más el lote actual cuando se edita)
const lotesDisponibles = async (incluirId = null) => {
  await limpiarVencidos();
  const libre = { "$compra.id_cmp$": null, "$carrito.id_lte$": null };
  return Lote.findAll({
    include: [
      { model: Compra, as: "compra", required: false },
      { model: Carrito, as: "carrito", required: false, attributes: ["id_lte"] },
      { model: Especie, as: "especies", attributes: ["nombre"] },
    ],
    where: incluirId ? { [Op.or]: [libre, { id_lte: incluirId }] } : libre,
    order: [["id_lte", "DESC"]],
  });
};

const formulario = async (res, compra, action, errores = null, editando = false) => {
  const lotes = await lotesDisponibles(editando ? compra.id_cmp : null);
  const compradores = await Comprador.findAll({ order: [["nombre", "ASC"]] });
  res.render("compras/formulario", {
    compra, lotes, compradores, action, method: "POST", errores, editando, valorDatetimeLocal,
  });
};

const inicio = async (req, res) => {
  const where = {};
  if (req.query.fecha) {
    const { inicio, fin } = rangoDelDia(req.query.fecha);
    where.fecha = { [Op.gte]: inicio, [Op.lt]: fin };
  }
  const compras = await Compra.findAll({
    where,
    order: [["fecha", "DESC"]],
    include: [
      { model: Comprador, as: "comprador" },
      { model: Pago, as: "pago", attributes: ["referencia"] },
      { model: Lote, as: "lote", include: [{ model: Especie, as: "especies", attributes: ["nombre"] }] },
    ],
  });
  res.render("compras/index", { compras, fecha: req.query.fecha || "", mostrarFecha, dinero });
};

const verCrear = (req, res) =>
  formulario(res, { id_cmp: req.query.lote || "", fecha: new Date() }, "/compras/registrar");

async function validar(req, editando) {
  if (!editando) {
    await check("id_cmp").isInt().withMessage("Selecciona un lote").bail()
      .custom(async (v) => {
        if (!(await Lote.findByPk(v))) throw new Error("El lote no existe");
        if (await Compra.findByPk(v)) throw new Error("Ese lote ya fue comprado");
        await limpiarVencidos();
        if (await Carrito.findByPk(v)) throw new Error("Ese lote está apartado en el carrito de un comprador en línea");
      }).run(req);
  }
  await check("codigo_cpr").isInt().withMessage("Selecciona un comprador").bail()
    .custom(async (v) => { if (!(await Comprador.findByPk(v))) throw new Error("El comprador no existe"); }).run(req);
  await check("precio_kilo_final").isFloat({ gt: 0 }).withMessage("El precio final por kilo debe ser mayor a 0").run(req);
  await check("fecha").isISO8601().withMessage("La fecha no es válida").run(req);
  return validationResult(req);
}

// Guardar compra: el total se calcula aquí (kilos del lote x precio final)
const registro = async (req, res) => {
  const valido = await validar(req, false);
  if (!valido.isEmpty()) return formulario(res, req.body, "/compras/registrar", valido.array());

  const { id_cmp, codigo_cpr, precio_kilo_final, fecha } = req.body;
  const lote = await Lote.findByPk(id_cmp);
  try {
    await Compra.create({
      id_cmp,
      codigo_cpr,
      precio_kilo_final,
      precio_total: (Number(lote.kilos) * Number(precio_kilo_final)).toFixed(2),
      fecha: new Date(fecha),
    });
  } catch (err) {
    // por si dos personas registran el mismo lote al mismo tiempo
    if (err.name === "SequelizeUniqueConstraintError") {
      return formulario(res, req.body, "/compras/registrar", [{ msg: "Ese lote ya fue comprado" }]);
    }
    throw err;
  }
  res.redirect("/compras/ver?ok=Compra registrada");
};

const editar = async (req, res) => {
  const compra = await Compra.findByPk(req.params.id);
  if (!compra) return res.redirect("/compras/ver");
  formulario(res, compra, `/compras/${compra.id_cmp}?_method=PUT`, null, true);
};

const actualizar = async (req, res) => {
  const compra = await Compra.findByPk(req.params.id, { include: [{ model: Lote, as: "lote" }] });
  if (!compra) return res.redirect("/compras/ver");
  const valido = await validar(req, true);
  if (!valido.isEmpty()) {
    return formulario(res, { ...req.body, id_cmp: compra.id_cmp }, `/compras/${compra.id_cmp}?_method=PUT`, valido.array(), true);
  }
  const { codigo_cpr, precio_kilo_final, fecha } = req.body;
  await compra.update({
    codigo_cpr,
    precio_kilo_final,
    precio_total: (Number(compra.lote.kilos) * Number(precio_kilo_final)).toFixed(2),
    fecha: new Date(fecha),
  });
  res.redirect("/compras/ver?ok=Compra actualizada");
};

const eliminar = async (req, res) => {
  await Compra.destroy({ where: { id_cmp: req.params.id } });
  res.redirect("/compras/ver?ok=Compra eliminada");
};

export { inicio, verCrear, registro, editar, actualizar, eliminar };
