import express from "express";
import { inicio, verCrear, registro, editar, actualizar, cambiarConfirmacion, eliminar } from "../controllers/usuarioController.js";

// todo este router es solo para el administrador (ver index.js)
const router = express.Router();

router.get("/ver", inicio);
router.get("/crear", verCrear);
router.post("/registrar", registro);
router.get("/:id/editar", editar);
router.put("/:id", actualizar);
router.patch("/:id/confirmar", cambiarConfirmacion);
router.delete("/:id", eliminar);

export default router;
