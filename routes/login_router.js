import express from "express";
import {
  login,
  verRegistro,
  registrologin,
  verRegistroComprador,
  registroComprador,
  confirmarIncripcionEnlace,
  credenciales,
  principal,
  cerrarsesion,
} from "../controllers/loginController.js";
import rutaProteger from "../middleware/protegerRutas.js";

const router_login = express.Router();

//Routing para login
router_login.get("/", login);
router_login.get("/ver_registro", verRegistro);
router_login.post("/registrar_login", registrologin);
router_login.get("/registro_comprador", verRegistroComprador);
router_login.post("/registrar_comprador", registroComprador);
router_login.get("/confirmarinscripcion/:token", confirmarIncripcionEnlace);
router_login.post("/credenciales", credenciales);
router_login.get("/inicio", rutaProteger, principal);
router_login.get("/cerrarsesion", cerrarsesion);

export default router_login;
