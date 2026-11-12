import { Op } from "sequelize";
import { check, validationResult } from "express-validator";
import { Usuario } from "../models/index.js";

const formulario = (res, persona, action, errores = null) =>
  res.render("usuarios/formulario", { persona, action, method: "POST", errores });

const inicio = async (req, res) => {
  const usuarios = await Usuario.scope("eliminarClave").findAll({
    attributes: { include: ["confirmar"] },
    order: [["id", "DESC"]],
  });
  res.render("usuarios/index", { usuarios });
};

const verCrear = (req, res) => formulario(res, null, "/usuarios/registrar");

// esComprador: la cuenta pertenece a un comprador de la tienda; su rol no se cambia desde aquí
async function validar(req, esNuevo, esComprador = false) {
  if (esComprador) req.body.rol = "comprador";
  await check("usuario").trim().notEmpty().withMessage("El usuario es obligatorio").run(req);
  await check("nombre").trim().notEmpty().withMessage("El nombre es obligatorio").run(req);
  await check("apellido").trim().notEmpty().withMessage("El apellido es obligatorio").run(req);
  await check("email").trim().isEmail().withMessage("El correo no es válido").run(req);
  await check("rol").isIn(esComprador ? ["comprador"] : ["admin", "usuario"]).withMessage("Rol no válido").run(req);
  if (esNuevo || req.body.password) {
    await check("password").isLength({ min: 6 }).withMessage("El password debe tener al menos 6 caracteres").run(req);
  }
  return validationResult(req);
}

// Guardar usuario (el administrador lo crea ya confirmado)
const registro = async (req, res) => {
  const valido = await validar(req, true);
  if (!valido.isEmpty()) return formulario(res, req.body, "/usuarios/registrar", valido.array());

  const { usuario, nombre, apellido, email, password, rol } = req.body;
  const repetido = await Usuario.findOne({ where: { [Op.or]: [{ usuario }, { email }] } });
  if (repetido) {
    return formulario(res, req.body, "/usuarios/registrar", [{ msg: "El usuario o correo ya existen" }]);
  }
  await Usuario.create({ usuario, nombre, apellido, email, password, rol, confirmar: true });
  res.redirect("/usuarios/ver?ok=Usuario registrado");
};

// FORMULARIO EDITAR
const editar = async (req, res) => {
  const persona = await Usuario.findByPk(req.params.id);
  if (!persona) return res.redirect("/usuarios/ver");
  formulario(res, persona, `/usuarios/${persona.id}?_method=PUT`);
};

// ACTUALIZAR
const actualizar = async (req, res) => {
  const persona = await Usuario.findByPk(req.params.id);
  if (!persona) return res.redirect("/usuarios/ver");

  const action = `/usuarios/${persona.id}?_method=PUT`;
  const valido = await validar(req, false, persona.rol === "comprador");
  if (!valido.isEmpty()) return formulario(res, { ...req.body, id: persona.id }, action, valido.array());

  const { usuario, nombre, apellido, email, password, rol } = req.body;
  const repetido = await Usuario.findOne({
    where: { [Op.or]: [{ usuario }, { email }], id: { [Op.ne]: persona.id } },
  });
  if (repetido) {
    return formulario(res, { ...req.body, id: persona.id }, action, [{ msg: "El usuario o correo ya existen" }]);
  }
  // el administrador no puede quitarse su propio rol de admin
  const nuevoRol = persona.id === req.usuario.id ? "admin" : rol;

  persona.set({ usuario, nombre, apellido, email, rol: nuevoRol });
  if (password) persona.password = password; // solo si escribieron uno nuevo
  await persona.save();
  res.redirect("/usuarios/ver?ok=Usuario actualizado");
};

// CONFIRMAR / DESACTIVAR cuenta
const cambiarConfirmacion = async (req, res) => {
  const persona = await Usuario.findByPk(req.params.id);
  if (persona && persona.id !== req.usuario.id) {
    persona.confirmar = !persona.confirmar;
    persona.token = null;
    await persona.save();
  }
  res.redirect("/usuarios/ver?ok=Estado de la cuenta actualizado");
};

// ELIMINAR
const eliminar = async (req, res) => {
  if (Number(req.params.id) === req.usuario.id) {
    return res.redirect("/usuarios/ver?aviso=No puedes eliminar tu propia cuenta");
  }
  await Usuario.destroy({ where: { id: req.params.id } });
  res.redirect("/usuarios/ver?ok=Usuario eliminado");
};

export { inicio, verCrear, registro, editar, actualizar, cambiarConfirmacion, eliminar };
