// Autorización: la tienda en línea es solo para cuentas con rol "comprador".
// Debe ir después de rutaProteger (que llena req.usuario).
const soloComprador = (req, res, next) => {
  if (req.usuario?.rol === "comprador" && req.usuario.codigo_cpr) return next();
  return res.redirect("/inicio");
};

export default soloComprador;
