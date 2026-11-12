import express from "express";
import {
  preparar, catalogo, estado, agregar, quitar, verCarrito, verPago, pagar, pedidos, comprobante,
} from "../controllers/tiendaController.js";

// todo este router es solo para compradores con sesión (ver index.js)
const router = express.Router();

router.use(preparar);

router.get("/", catalogo);
router.get("/estado", estado);
router.post("/carrito/:id", agregar);
router.delete("/carrito/:id", quitar);
router.get("/carrito", verCarrito);
router.get("/pago", verPago);
router.post("/pago", pagar);
router.get("/pedidos", pedidos);
router.get("/pedidos/:id", comprobante);

export default router;
