import { Op } from "sequelize";
import { check, validationResult } from "express-validator";
import dotenv from "dotenv";
import { idGenera, JWTGenera } from "../helpers/tokens.js";
import { correoRegistro } from "../helpers/correo.js";
import { rangoDelDia, fechaISO, dinero } from "../helpers/fechas.js";
import db from "../config/db.js";
import { Usuario, Lote, Compra, Comprador } from "../models/index.js";
dotenv.config({ path: ".env", quiet: true });

// a dónde va cada quien después de iniciar sesión
const inicioSegunRol = (rol) => (rol === "comprador" ? "/tienda" : "/inicio");

const vistaLogin = (res, extra = {}) =>
  res.render("login/login.ejs", {
    action: "/credenciales",
    method: "POST",
    mensaje: null,
    errores: null,
    datos: {},
    ...extra,
  });

const vistaRegistro = (res, extra = {}) =>
  res.render("login/loginformulario.ejs", {
    persona: null,
    action: "/registrar_login",
    method: "POST",
    errores: null,
    ...extra,
  });

const vistaRegistroComprador = (res, extra = {}) =>
  res.render("login/registrocomprador.ejs", {
    persona: null,
    action: "/registrar_comprador",
    method: "POST",
    errores: null,
    ...extra,
  });

const login = async (req, res) => {
  // si ya tiene sesión, lo mandamos directo al inicio (rutaProteger decide si el token sirve)
  if (req.cookies._token) return res.redirect("/inicio");
  vistaLogin(res);
};

const verRegistro = async (req, res) => {
  vistaRegistro(res);
};

const verRegistroComprador = async (req, res) => {
  vistaRegistroComprador(res);
};

// Guardar un comprador que se registra solo: crea el comprador y su cuenta de acceso
const registroComprador = async (req, res) => {
  const valido = await validacionRegistroComprador(req);
  if (!valido.isEmpty()) {
    return vistaRegistroComprador(res, { persona: req.body, errores: valido.array() });
  }

  const { usuario, nombre, apellido_paterno, apellido_materno, direccion, correo, password } = req.body;
  const repetidos = [];
  if (await Usuario.findOne({ where: { [Op.or]: [{ usuario }, { email: correo }] } })) {
    repetidos.push({ msg: "El nombre de usuario o el correo ya están registrados" });
  } else if (await Comprador.findOne({ where: { correo } })) {
    repetidos.push({ msg: "Ya existe un comprador con ese correo; pide al administrador que te cree la cuenta" });
  }
  if (repetidos.length) return vistaRegistroComprador(res, { persona: req.body, errores: repetidos });

  const token = idGenera();
  await db.transaction(async (t) => {
    const comprador = await Comprador.create(
      { nombre, apellido_paterno, apellido_materno: apellido_materno || null, direccion, correo },
      { transaction: t }
    );
    await Usuario.create(
      {
        usuario,
        nombre,
        apellido: `${apellido_paterno} ${apellido_materno || ""}`.trim(),
        email: correo,
        password,
        rol: "comprador",
        codigo_cpr: comprador.codigo_cpr,
        token,
      },
      { transaction: t }
    );
  });

  try {
    await correoRegistro({ nombre, email: correo, token });
    res.render("login/confirmacion", {
      pagina: "Cuenta de comprador creada",
      mensaje: "Te enviamos un correo para confirmar tu cuenta. Después podrás entrar a la tienda.",
      enlace: "/",
    });
  } catch (err) {
    console.log("No se pudo enviar el correo:", err.message);
    res.render("login/confirmacion", {
      pagina: "Cuenta de comprador creada",
      mensaje:
        "Tu cuenta se creó, pero no se pudo enviar el correo de confirmación. Pide al administrador de la lonja que active tu cuenta.",
      enlace: "/",
    });
  }
};

async function validacionRegistroComprador(req) {
  await check("usuario").trim().notEmpty().withMessage("El usuario no debe ser vacío")
    .isLength({ max: 30 }).withMessage("El usuario debe tener máximo 30 caracteres").run(req);
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
  await check("password").isLength({ min: 6 }).withMessage("El password debe tener al menos 6 caracteres").run(req);
  await check("repetir").equals(req.body.password || "").withMessage("Los passwords no coinciden").run(req);
  return validationResult(req);
}

// Guardar el usuario que se registra solo
const registrologin = async (req, res) => {
  const valido = await validacionRegistro(req);
  if (!valido.isEmpty()) {
    return vistaRegistro(res, { persona: req.body, errores: valido.array() });
  }

  const { usuario, nombre, apellido, email, password } = req.body;
  const repetido = await Usuario.findOne({ where: { [Op.or]: [{ usuario }, { email }] } });
  if (repetido) {
    return vistaRegistro(res, {
      persona: req.body,
      errores: [{ msg: "El nombre de usuario o el correo ya están registrados" }],
    });
  }

  const token = idGenera();
  await Usuario.create({ usuario, nombre, apellido, email, password, rol: "usuario", token });

  try {
    await correoRegistro({ nombre, email, token });
    res.render("login/confirmacion", {
      pagina: "Cuenta creada",
      mensaje: "Te enviamos un correo para confirmar tu cuenta. Revisa tu bandeja de entrada.",
      enlace: "/",
    });
  } catch (err) {
    console.log("No se pudo enviar el correo:", err.message);
    res.render("login/confirmacion", {
      pagina: "Cuenta creada",
      mensaje:
        "Tu cuenta se creó, pero no se pudo enviar el correo de confirmación. Pide al administrador que confirme tu cuenta.",
      enlace: "/",
    });
  }
};

async function validacionRegistro(req) {
  await check("usuario").trim().notEmpty().withMessage("El usuario no debe ser vacío")
    .isLength({ max: 30 }).withMessage("El usuario debe tener máximo 30 caracteres").run(req);
  await check("nombre").trim().notEmpty().withMessage("El nombre no debe ser vacío").run(req);
  await check("apellido").trim().notEmpty().withMessage("El apellido no debe ser vacío").run(req);
  await check("email").trim().isEmail().withMessage("El correo no es válido").run(req);
  await check("password").isLength({ min: 6 }).withMessage("El password debe tener al menos 6 caracteres").run(req);
  await check("repetir").equals(req.body.password || "").withMessage("Los passwords no coinciden").run(req);
  return validationResult(req);
}

//confirmación de inscripción del usuario
const confirmarIncripcionEnlace = async (req, res) => {
  const { token } = req.params;
  const usuario = await Usuario.findOne({ where: { token } });

  if (!usuario) {
    return res.render("login/confirmacion", {
      pagina: "No se pudo confirmar tu cuenta",
      mensaje: "Lo lamentamos, el enlace no es válido o ya se utilizó.",
      enlace: "/",
    });
  }

  //confirmar la cuenta del usuario
  usuario.token = null;
  usuario.confirmar = true;
  await usuario.save();

  res.render("login/confirmacion", {
    pagina: "Su cuenta se confirmó exitosamente",
    mensaje: "Felicidades, el registro se terminó exitosamente. Ya puedes iniciar sesión.",
    enlace: "/",
  });
};

//comprobando las credenciales
const credenciales = async (req, res) => {
  const valido = await validacionFormularioInicio(req);
  if (!valido.isEmpty()) {
    return vistaLogin(res, { mensaje: "Credenciales no válidas", errores: valido.array(), datos: req.body });
  }

  //comprobar si el usuario existe (por nombre de usuario o correo)
  const { usuario, password } = req.body;
  const us = await Usuario.findOne({ where: { [Op.or]: [{ usuario }, { email: usuario }] } });
  if (!us) {
    return vistaLogin(res, { mensaje: "Credenciales no válidas", errores: [{ msg: "Revisa las credenciales" }], datos: req.body });
  }

  //comprobar si el usuario está confirmado
  if (!us.confirmar) {
    return vistaLogin(res, {
      mensaje: "Credenciales no válidas",
      errores: [{ msg: "Tu cuenta no tiene confirmación, revisa tu correo" }],
      datos: req.body,
    });
  }

  //comprobando el password
  if (!us.verificandoClave(password)) {
    return vistaLogin(res, { mensaje: "Credenciales no válidas", errores: [{ msg: "Revisa las credenciales" }], datos: req.body });
  }

  //crear jsonwebtoken y guardarlo en una cookie
  const token = JWTGenera({ id: us.id, email: us.email });
  return res
    .cookie("_token", token, {
      httpOnly: true, //no accesible desde el API de JavaScript
      sameSite: "strict",
      maxAge: 60 * 60 * 1000, //la sesión dura 1 hora
      //secure:true //solo con certificado SSL (https)
    })
    .redirect(inicioSegunRol(us.rol)); // el comprador va a la tienda, el personal al inicio
};

async function validacionFormularioInicio(req) {
  await check("usuario").trim().notEmpty().withMessage("El usuario no debe ser vacío").run(req);
  await check("password").notEmpty().withMessage("El password no debe ser vacío").run(req);
  return validationResult(req);
}

// Página principal con el resumen del día
const principal = async (req, res) => {
  if (req.usuario.rol === "comprador") return res.redirect("/tienda");
  const hoy = fechaISO();
  const { inicio, fin } = rangoDelDia(hoy);
  const comprasHoy = await Compra.findAll({
    where: { fecha: { [Op.gte]: inicio, [Op.lt]: fin } },
    include: [{ model: Lote, as: "lote" }],
  });
  const lotesSinVender = await Lote.count({
    include: [{ model: Compra, as: "compra", required: false }],
    where: { "$compra.id_cmp$": null },
  });

  res.render("index.ejs", {
    hoy,
    numCompras: comprasHoy.length,
    kilos: comprasHoy.reduce((s, c) => s + Number(c.lote.kilos), 0),
    importe: dinero(comprasHoy.reduce((s, c) => s + Number(c.precio_total), 0)),
    lotesSinVender,
  });
};

const cerrarsesion = async (req, res) => {
  res.clearCookie("_token", {
    httpOnly: true,
    sameSite: "strict",
  });
  return res.redirect("/");
};

export {
  login,
  verRegistro,
  registrologin,
  verRegistroComprador,
  registroComprador,
  confirmarIncripcionEnlace,
  credenciales,
  principal,
  cerrarsesion,
};
