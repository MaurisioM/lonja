import { Op } from "sequelize";
import { check, validationResult } from "express-validator";
import { Comprador, Compra } from "../models/index.js";

const formulario = (res, comprador, action, errores = null) =>
  res.render("compradores/formulario", { comprador, action, method: "POST", errores });

const inicio = async (req, res) => {
  const compradores = await Comprador.findAll({
    order: [["codigo_cpr", "DESC"]],
    include: [{ model: Compra, as: "compras", attributes: ["id_cmp"] }],
  });
  res.render("compradores/index", { compradores });
};

const verCrear = (req, res) => formulario(res, null, "/compradores/registrar");

async function validar(req) {
  await check("nombre").trim().notEmpty().withMessage("El nombre es obligatorio")
    .isLength({ max: 15 }).withMessage("El nombre debe tener máximo 15 caracteres").run(req);
  await check("apellido_paterno").trim().notEmpty().withMessage("El apellido paterno es obligatorio")
    .isLength({ max: 15 }).withMessage("El apellido paterno debe tener máximo 15 caracteres").run(req);
  await check("apellido_materno").trim()
    .isLength({ max: 15 }).withMessage("El apellido materno debe tener máximo 15 caracteres").run(req);
  await check("direccion").trim().notEmpty().withMessage("La dirección es obligatoria")
    .isLength({ max: 200 }).withMessage("La dirección debe tener máximo 200 caracteres").run(req);
  await check("correo").trim().isEmail().withMessage("El correo no es válido")
    .isLength({ max: 80 }).withMessage("El correo debe tener máximo 80 caracteres").run(req);
  return validationResult(req);
}

const datos = (body) => ({
  nombre: body.nombre,
  apellido_paterno: body.apellido_paterno,
  apellido_materno: body.apellido_materno || null,
  direccion: body.direccion,
  correo: body.correo,
});

const registro = async (req, res) => {
  const valido = await validar(req);
  if (!valido.isEmpty()) return formulario(res, req.body, "/compradores/registrar", valido.array());
  if (await Comprador.findOne({ where: { correo: req.body.correo } })) {
    return formulario(res, req.body, "/compradores/registrar", [{ msg: "El correo ya está registrado" }]);
  }
  await Comprador.create(datos(req.body));
  res.redirect("/compradores/ver?ok=Comprador registrado");
};

const editar = async (req, res) => {
  const comprador = await Comprador.findByPk(req.params.id);
  if (!comprador) return res.redirect("/compradores/ver");
  formulario(res, comprador, `/compradores/${comprador.codigo_cpr}?_method=PUT`);
};

const actualizar = async (req, res) => {
  const comprador = await Comprador.findByPk(req.params.id);
  if (!comprador) return res.redirect("/compradores/ver");
  const action = `/compradores/${comprador.codigo_cpr}?_method=PUT`;
  const valido = await validar(req);
  if (!valido.isEmpty()) {
    return formulario(res, { ...req.body, codigo_cpr: comprador.codigo_cpr }, action, valido.array());
  }
  const repetido = await Comprador.findOne({
    where: { correo: req.body.correo, codigo_cpr: { [Op.ne]: comprador.codigo_cpr } },
  });
  if (repetido) {
    return formulario(res, { ...req.body, codigo_cpr: comprador.codigo_cpr }, action, [{ msg: "El correo ya está registrado" }]);
  }
  await comprador.update(datos(req.body));
  res.redirect("/compradores/ver?ok=Comprador actualizado");
};

const eliminar = async (req, res) => {
  const compras = await Compra.count({ where: { codigo_cpr: req.params.id } });
  if (compras > 0) {
    return res.redirect("/compradores/ver?aviso=No se puede eliminar: el comprador tiene compras registradas");
  }
  await Comprador.destroy({ where: { codigo_cpr: req.params.id } });
  res.redirect("/compradores/ver?ok=Comprador eliminado");
};

export { inicio, verCrear, registro, editar, actualizar, eliminar };
