import { check, validationResult } from "express-validator";
import fs from "fs/promises";
import { Especie, Lote, Tipo } from "../models/index.js";

const borrarImagen = (nombre) =>
  nombre ? fs.unlink(`public/img/especies/${nombre}`).catch(() => {}) : Promise.resolve();

const formulario = async (res, especie, action, errores = null) => {
  const lotes = await Lote.findAll({ order: [["id_lte", "DESC"]] });
  const tipos = await Tipo.findAll({ order: [["nombre", "ASC"]] });
  res.render("especies/formulario", { especie, lotes, tipos, action, method: "POST", errores });
};

const inicio = async (req, res) => {
  const especies = await Especie.findAll({
    order: [["id_epe", "DESC"]],
    include: [
      { model: Lote, as: "lote" },
      { model: Tipo, as: "tipo" },
    ],
  });
  res.render("especies/index", { especies });
};

// ?lote=5 deja el lote preseleccionado
const verCrear = (req, res) =>
  formulario(res, { id_lte: req.query.lote || "" }, "/especies/registrar");

async function validar(req) {
  await check("nombre").trim().notEmpty().withMessage("El nombre es obligatorio")
    .isLength({ max: 25 }).withMessage("El nombre debe tener máximo 25 caracteres").run(req);
  await check("id_lte").isInt().withMessage("Selecciona un lote").bail()
    .custom(async (v) => { if (!(await Lote.findByPk(v))) throw new Error("El lote no existe"); }).run(req);
  await check("id_tpo").isInt().withMessage("Selecciona un tipo").bail()
    .custom(async (v) => { if (!(await Tipo.findByPk(v))) throw new Error("El tipo no existe"); }).run(req);
  const errores = validationResult(req).array();
  if (req.errorImagen) errores.push({ msg: req.errorImagen });
  return errores;
}

const registro = async (req, res) => {
  const errores = await validar(req);
  if (errores.length) {
    await borrarImagen(req.file?.filename);
    return formulario(res, req.body, "/especies/registrar", errores);
  }
  const { nombre, id_lte, id_tpo } = req.body;
  await Especie.create({ nombre, id_lte, id_tpo, imagen: req.file?.filename || null });

  // botón "Guardar y agregar otra" para capturar varias especies del mismo lote
  if (req.body.otra) {
    return res.redirect(`/especies/crear?lote=${id_lte}&ok=Especie registrada en el lote ${id_lte}`);
  }
  res.redirect("/especies/ver?ok=Especie registrada");
};

const editar = async (req, res) => {
  const especie = await Especie.findByPk(req.params.id);
  if (!especie) return res.redirect("/especies/ver");
  formulario(res, especie, `/especies/${especie.id_epe}?_method=PUT`);
};

const actualizar = async (req, res) => {
  const especie = await Especie.findByPk(req.params.id);
  if (!especie) return res.redirect("/especies/ver");
  const errores = await validar(req);
  if (errores.length) {
    await borrarImagen(req.file?.filename);
    return formulario(
      res,
      { ...req.body, id_epe: especie.id_epe, imagen: especie.imagen },
      `/especies/${especie.id_epe}?_method=PUT`,
      errores
    );
  }
  const { nombre, id_lte, id_tpo } = req.body;
  const anterior = especie.imagen;
  await especie.update({ nombre, id_lte, id_tpo, imagen: req.file ? req.file.filename : anterior });
  if (req.file) await borrarImagen(anterior);
  res.redirect("/especies/ver?ok=Especie actualizada");
};

const eliminar = async (req, res) => {
  const especie = await Especie.findByPk(req.params.id);
  if (especie) {
    await especie.destroy();
    await borrarImagen(especie.imagen);
  }
  res.redirect("/especies/ver?ok=Especie eliminada");
};

export { inicio, verCrear, registro, editar, actualizar, eliminar };
