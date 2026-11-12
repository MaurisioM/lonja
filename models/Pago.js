import { DataTypes } from "sequelize";
import db from "../config/db.js";

// Pago en línea de un comprador. Un pago agrupa una o varias compras (lotes).
// Por seguridad NO se guarda el número completo de la tarjeta ni el CVV.
const Pago = db.define(
  "Pago",
  {
    id_pgo: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    codigo_cpr: {
      // FK -> comprador
      type: DataTypes.SMALLINT,
      allowNull: false,
    },
    total: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    metodo: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "tarjeta",
    },
    titular: {
      type: DataTypes.STRING(60),
      allowNull: false,
    },
    ultimos4: {
      type: DataTypes.STRING(4),
      allowNull: false,
    },
    referencia: {
      // folio del pago
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
    },
    fecha: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "pago",
    timestamps: false,
  }
);

export default Pago;
