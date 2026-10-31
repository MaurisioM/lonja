import { check, validationResult } from "express-validator";
import { Tipo, Especie } from "../models/index.js";

const formulario = (res, tipo, action, errores = null) =>
  res.render("tipos/formulario", { tipo, action, method: "POST", errores });

const inicio = async (req, res) => {
  const tipos = await Tipo.findAll({
    order: [["id_tpo", "ASC"]],
    include: [{ model: Especie, as: "especies", attributes: ["id_epe"] }],
  });
  res.render("tipos/index", { tipos });
};

const verCrear = (req, res) => formulario(res, null, "/tipos/registrar");

async function validar(req) {
  await check("nombre").trim().notEmpty().withMessage("El nombre es obligatorio")
    .isLength({ max: 30 }).withMessage("El nombre debe tener máximo 30 caracteres").run(req);
  return validationResult(req);
}

const registro = async (req, res) => {
  const valido = await validar(req);
  if (!valido.isEmpty()) return formulario(res, req.body, "/tipos/registrar", valido.array());
  await Tipo.create({ nombre: req.body.nombre });
  res.redirect("/tipos/ver?ok=Tipo registrado");
};

const editar = async (req, res) => {
  const tipo = await Tipo.findByPk(req.params.id);
  if (!tipo) return res.redirect("/tipos/ver");
  formulario(res, tipo, `/tipos/${tipo.id_tpo}?_method=PUT`);
};

const actualizar = async (req, res) => {
  const tipo = await Tipo.findByPk(req.params.id);
  if (!tipo) return res.redirect("/tipos/ver");
  const valido = await validar(req);
  if (!valido.isEmpty()) {
    return formulario(res, { ...req.body, id_tpo: tipo.id_tpo }, `/tipos/${tipo.id_tpo}?_method=PUT`, valido.array());
  }
  await tipo.update({ nombre: req.body.nombre });
  res.redirect("/tipos/ver?ok=Tipo actualizado");
};

const eliminar = async (req, res) => {
  const usadas = await Especie.count({ where: { id_tpo: req.params.id } });
  if (usadas > 0) {
    return res.redirect("/tipos/ver?aviso=No se puede eliminar: hay especies con este tipo");
  }
  await Tipo.destroy({ where: { id_tpo: req.params.id } });
  res.redirect("/tipos/ver?ok=Tipo eliminado");
};

export { inicio, verCrear, registro, editar, actualizar, eliminar };
