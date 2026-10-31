import { Sequelize } from "sequelize";
import dotenv from "dotenv";
dotenv.config({ path: ".env", quiet: true });

const db = new Sequelize(process.env.BD_NOMBRE, process.env.BD_USUARIO, process.env.BD_CLAVE, {
  dialect: process.env.BD_DIALEC,
  host: process.env.BD_HOST,
  port: process.env.BD_PORT,
  // hora de Veracruz / CDMX, para que el reporte diario use el día local
  timezone: "-06:00",
  logging: false,
  define: {
    timestamps: false,
    underscored: false,
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

export default db;
