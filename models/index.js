import Usuario from "./Usuario.js";
import Tipo from "./Tipo.js";
import Lote from "./Lote.js";
import Especie from "./Especie.js";
import Comprador from "./Comprador.js";
import Compra from "./Compra.js";
import Carrito from "./Carrito.js";
import Pago from "./Pago.js";

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

// Lote 1 --- 1 Carrito (un lote solo puede estar apartado por un comprador)
Lote.hasOne(Carrito, { foreignKey: "id_lte", as: "carrito", onDelete: "CASCADE" });
Carrito.belongsTo(Lote, { foreignKey: "id_lte", as: "lote" });

// Comprador 1 --- N Carrito
Comprador.hasMany(Carrito, { foreignKey: "codigo_cpr", as: "carrito", onDelete: "CASCADE" });
Carrito.belongsTo(Comprador, { foreignKey: "codigo_cpr", as: "comprador" });

// Comprador 1 --- N Pago
Comprador.hasMany(Pago, { foreignKey: "codigo_cpr", as: "pagos", onDelete: "RESTRICT" });
Pago.belongsTo(Comprador, { foreignKey: "codigo_cpr", as: "comprador" });

// Pago 1 --- N Compra (las compras de mostrador no tienen pago)
Pago.hasMany(Compra, { foreignKey: "id_pgo", as: "compras", constraints: false });
Compra.belongsTo(Pago, { foreignKey: "id_pgo", as: "pago", constraints: false });

// Usuario (rol comprador) N --- 1 Comprador
Usuario.belongsTo(Comprador, { foreignKey: "codigo_cpr", as: "comprador", constraints: false });

export { Usuario, Tipo, Lote, Especie, Comprador, Compra, Carrito, Pago };
