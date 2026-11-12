import { Op } from "sequelize";
import { Carrito } from "../models/index.js";

// minutos que un lote queda apartado en el carrito antes de liberarse solo
const MINUTOS = Number(process.env.CARRITO_MINUTOS) || 30;

const limite = () => new Date(Date.now() - MINUTOS * 60 * 1000);

// borra los apartados vencidos para que esos lotes vuelvan a estar disponibles
const limpiarVencidos = (transaction) =>
  Carrito.destroy({ where: { agregado: { [Op.lt]: limite() } }, transaction });

// fecha en la que vence un apartado
const venceEn = (fila) => new Date(new Date(fila.agregado).getTime() + MINUTOS * 60 * 1000);

export { MINUTOS, limpiarVencidos, venceEn };
