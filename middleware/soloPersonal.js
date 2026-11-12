// Autorización: deja pasar solo al personal de la lonja (admin / usuario).
// Un comprador que intente entrar a la administración se manda a la tienda.
// Debe ir después de rutaProteger (que llena req.usuario).
const soloPersonal = (req, res, next) => {
  if (req.usuario && req.usuario.rol !== "comprador") return next();
  return res.redirect("/tienda");
};

export default soloPersonal;
