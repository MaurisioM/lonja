import jwt from "jsonwebtoken";
import { Usuario } from "../models/index.js";

const rutaProteger = async (req, res, next) => {
  //verificar si hay token
  const { _token } = req.cookies;
  if (!_token) {
    return res.redirect("/");
  }

  //verificar el token
  try {
    const decoded = jwt.verify(_token, process.env.SC_JWT);
    const usuario = await Usuario.scope("eliminarClave").findByPk(decoded.id);

    //almacenar el usuario en req y en las vistas
    if (!usuario) {
      return res.clearCookie("_token").redirect("/");
    }
    req.usuario = usuario;
    res.locals.usuario = usuario;
    return next();
  } catch (error) {
    return res.clearCookie("_token").redirect("/");
  }
};

export default rutaProteger;
