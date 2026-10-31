import Usuario from "./Usuario.js";
import Tipo from "./Tipo.js";
import Lote from "./Lote.js";
import Especie from "./Especie.js";
import Comprador from "./Comprador.js";
import Compra from "./Compra.js";

// Asociaciones (según el diseño relacional)

// Lote 1 --- N Especie
Lote.hasMany(Especie, { foreignKey: "id_lte", as: "especies", onDelete: "RESTRICT" });
Especie.belongsTo(Lote, { foreignKey: "id_lte", as: "lote" });

// Tipo 1 --- N Especie
Tipo.hasMany(Especie, { foreignKey: "id_tpo", as: "especies", onDelete: "RESTRICT" });
Especie.belongsTo(Tipo, { foreignKey: "id_tpo", as: "tipo" });

// Lote 1 --- 1 Compra
Lote.hasOne(Compra, { foreignKey: "id_cmp", as: "compra", onDelete: "RESTRICT" });
Compra.belongsTo(Lote, { foreignKey: "id_cmp", as: "lote" });

// Comprador 1 --- N Compra
Comprador.hasMany(Compra, { foreignKey: "codigo_cpr", as: "compras", onDelete: "RESTRICT" });
Compra.belongsTo(Comprador, { foreignKey: "codigo_cpr", as: "comprador" });

export { Usuario, Tipo, Lote, Especie, Comprador, Compra };
