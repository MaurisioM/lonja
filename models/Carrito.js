import { DataTypes } from "sequelize";
import db from "../config/db.js";

// Lotes apartados en el carrito de un comprador.
// id_lte es la llave primaria: un lote solo puede estar en UN carrito a la vez,
// así la base de datos impide que dos compradores lo aparten al mismo tiempo.
const Carrito = db.define(
  "Carrito",
  {
    id_lte: {
      // PK y FK -> lote
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    codigo_cpr: {
      // FK -> comprador
      type: DataTypes.SMALLINT,
      allowNull: false,
    },
    agregado: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "carrito",
    timestamps: false,
  }
);

export default Carrito;
