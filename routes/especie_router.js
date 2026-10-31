import express from "express";
import { inicio, verCrear, registro, editar, actualizar, eliminar } from "../controllers/especieController.js";
import soloAdmin from "../middleware/soloAdmin.js";
import imagenEspecie from "../helpers/subirImagen.js";

const router = express.Router();

//Routing especie (los formularios llevan imagen, por eso usan multer)
router.get("/ver", inicio);
router.get("/crear", verCrear);
router.post("/registrar", imagenEspecie, registro);
router.get("/:id/editar", editar);
router.put("/:id", imagenEspecie, actualizar);
router.delete("/:id", soloAdmin, eliminar); // solo el administrador puede eliminar

export default router;
