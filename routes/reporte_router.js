import express from "express";
import { reporte } from "../controllers/reporteController.js";

const router = express.Router();

// /reportes?modo=dia&fecha=AAAA-MM-DD   o   /reportes?modo=rango&desde=AAAA-MM-DD&hasta=AAAA-MM-DD
router.get("/", reporte);
router.get("/diario", reporte); // dirección anterior: sigue funcionando (reporte de un día)

export default router;
