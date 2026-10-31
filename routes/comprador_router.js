import express from "express";
import { inicio, verCrear, registro, editar, actualizar, eliminar } from "../controllers/compradorController.js";
import soloAdmin from "../middleware/soloAdmin.js";

const router = express.Router();

//Routing comprador
router.get("/ver", inicio);
router.get("/crear", verCrear);
router.post("/registrar", registro);
router.get("/:id/editar", editar);
router.put("/:id", actualizar);
router.delete("/:id", soloAdmin, eliminar); // solo el administrador puede eliminar

export default router;
