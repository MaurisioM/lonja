import { DataTypes } from "sequelize";
import db from "../config/db.js";

const Especie = db.define(
  "Especie",
  {
    id_epe: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nombre: {
      type: DataTypes.STRING(25),
      allowNull: false,
    },
    id_lte: {
      // FK -> lote
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    id_tpo: {
      // FK -> tipo
      type: DataTypes.SMALLINT,
      allowNull: false,
    },
    imagen: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
  },
  {
    tableName: "especie",
    timestamps: false,
  }
);

export default Especie;
