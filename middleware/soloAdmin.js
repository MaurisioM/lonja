// Autorización: solo deja pasar a usuarios con rol "admin".
// Debe ir después de rutaProteger (que llena req.usuario).
const soloAdmin = (req, res, next) => {
  if (req.usuario?.rol === "admin") {
    return next();
  }
  return res.status(403).render("login/confirmacion", {
    pagina: "Acceso denegado",
    mensaje: "No tienes permisos para realizar esta acción. Solo el administrador puede hacerlo.",
    enlace: "/inicio",
  });
};

export default soloAdmin;
