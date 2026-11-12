import { DataTypes } from "sequelize";
import db from "../config/db.js";

// db.sync() crea las tablas nuevas pero no agrega columnas a las que ya existen.
// Aquí se agregan las columnas nuevas a una base de datos creada con una versión anterior.
const columnas = [
  { tabla: "usuario", columna: "codigo_cpr", def: { type: DataTypes.SMALLINT, allowNull: true } },
  { tabla: "compra", columna: "id_pgo", def: { type: DataTypes.INTEGER, allowNull: true } },
];

async function migrar() {
  const qi = db.getQueryInterface();
  for (const { tabla, columna, def } of columnas) {
    const actual = await qi.describeTable(tabla);
    if (!actual[columna]) {
      await qi.addColumn(tabla, columna, def);
      console.log(`Columna ${tabla}.${columna} agregada.`);
    }
  }
}

export default migrar;
