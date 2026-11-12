import { check, validationResult } from "express-validator";
import db from "../config/db.js";
import { Lote, Especie, Tipo, Compra, Carrito, Pago } from "../models/index.js";
import { MINUTOS, limpiarVencidos, venceEn } from "../helpers/carrito.js";
import { idGenera } from "../helpers/tokens.js";
import { mostrarFecha, dinero } from "../helpers/fechas.js";

// cada lote es un artículo: se paga kilos x precio de salida
const totalLote = (l) => Math.round(Number(l.kilos) * Number(l.precio_kilo_salida) * 100) / 100;
const suma = (lotes) => Math.round(lotes.reduce((s, l) => s + totalLote(l), 0) * 100) / 100;

const conEspecies = { model: Especie, as: "especies", include: [{ model: Tipo, as: "tipo" }] };

// Se ejecuta antes de cada página de la tienda: libera los apartados vencidos
// y deja listo el contador del carrito para la barra de navegación
const preparar = async (req, res, next) => {
  await limpiarVencidos();
  res.locals.enCarrito = await Carrito.count({ where: { codigo_cpr: req.usuario.codigo_cpr } });
  res.locals.dinero = dinero;
  res.locals.mostrarFecha = mostrarFecha;
  res.locals.totalLote = totalLote;
  next();
};

const miCarrito = (codigo_cpr, transaction) =>
  Carrito.findAll({
    where: { codigo_cpr },
    include: [{ model: Lote, as: "lote", include: [conEspecies] }],
    order: [["agregado", "ASC"], ["id_lte", "ASC"]],
    transaction,
  });

// Catálogo: todos los lotes que no se han vendido
const catalogo = async (req, res) => {
  const lotes = await Lote.findAll({
    include: [
      { model: Compra, as: "compra", required: false, attributes: ["id_cmp"] },
      { model: Carrito, as: "carrito", required: false },
      conEspecies,
    ],
    where: { "$compra.id_cmp$": null },
    order: [["id_lte", "DESC"]],
  });
  const yo = req.usuario.codigo_cpr;
  res.render("tienda/catalogo", {
    lotes: lotes.map((l) => ({
      lote: l,
      // disponible | mio | apartado (en el carrito de otro comprador)
      estado: !l.carrito ? "disponible" : l.carrito.codigo_cpr === yo ? "mio" : "apartado",
    })),
    minutos: MINUTOS,
  });
};

// Estado de los lotes en JSON: el catálogo lo consulta cada pocos segundos
// para marcar "No disponible" lo que otros compradores van apartando
const estado = async (req, res) => {
  const [enVenta, carritos] = await Promise.all([
    Lote.findAll({
      attributes: ["id_lte"],
      include: [{ model: Compra, as: "compra", required: false, attributes: [] }],
      where: { "$compra.id_cmp$": null },
      raw: true,
    }),
    Carrito.findAll({ attributes: ["id_lte", "codigo_cpr"], raw: true }),
  ]);
  const yo = req.usuario.codigo_cpr;
  res.set("Cache-Control", "no-store").json({
    enVenta: enVenta.map((l) => l.id_lte),
    apartados: carritos.filter((c) => c.codigo_cpr !== yo).map((c) => c.id_lte),
    mios: carritos.filter((c) => c.codigo_cpr === yo).map((c) => c.id_lte),
  });
};

// Agregar un lote al carrito: queda apartado y los demás lo ven "No disponible"
const agregar = async (req, res) => {
  const id_lte = Number(req.params.id);
  const lote = Number.isInteger(id_lte)
    ? await Lote.findByPk(id_lte, { include: [{ model: Compra, as: "compra" }] })
    : null;
  if (!lote) return res.redirect("/tienda?aviso=Ese lote no existe");
  if (lote.compra) return res.redirect("/tienda?aviso=Ese lote ya fue vendido");

  try {
    await Carrito.create({ id_lte, codigo_cpr: req.usuario.codigo_cpr, agregado: new Date() });
  } catch (err) {
    // la llave primaria en id_lte impide que dos compradores aparten el mismo lote
    if (err.name !== "SequelizeUniqueConstraintError") throw err;
    const fila = await Carrito.findByPk(id_lte);
    return res.redirect(
      fila?.codigo_cpr === req.usuario.codigo_cpr
        ? "/tienda?aviso=Ese lote ya está en tu carrito"
        : "/tienda?aviso=Ese lote ya no está disponible: otro comprador lo tiene en su carrito"
    );
  }
  res.redirect(`/tienda?ok=Lote ${id_lte} agregado a tu carrito. Lo tienes apartado ${MINUTOS} minutos`);
};

const quitar = async (req, res) => {
  await Carrito.destroy({ where: { id_lte: req.params.id, codigo_cpr: req.usuario.codigo_cpr } });
  const regreso = req.query.desde === "catalogo" ? "/tienda" : "/tienda/carrito";
  res.redirect(`${regreso}?ok=Lote quitado de tu carrito`);
};

const verCarrito = async (req, res) => {
  const filas = await miCarrito(req.usuario.codigo_cpr);
  res.render("tienda/carrito", {
    filas,
    total: suma(filas.map((f) => f.lote)),
    venceEn,
    minutos: MINUTOS,
  });
};

const vistaPago = async (req, res, extra = {}) => {
  const filas = await miCarrito(req.usuario.codigo_cpr);
  if (!filas.length) return res.redirect("/tienda/carrito?aviso=Tu carrito está vacío");
  res.render("tienda/pago", {
    filas,
    total: suma(filas.map((f) => f.lote)),
    errores: null,
    titular: "",
    ...extra,
  });
};

const verPago = (req, res) => vistaPago(req, res);

// algoritmo de Luhn: comprueba que el número de tarjeta esté bien formado
const luhn = (numero) => {
  let total = 0;
  let doble = false;
  for (let i = numero.length - 1; i >= 0; i--) {
    let d = Number(numero[i]);
    if (doble) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    total += d;
    doble = !doble;
  }
  return total % 10 === 0;
};

async function validarTarjeta(req) {
  req.body.numero = String(req.body.numero || "").replace(/[\s-]/g, "");
  await check("titular").trim().notEmpty().withMessage("Escribe el nombre del titular de la tarjeta")
    .isLength({ max: 60 }).withMessage("El nombre del titular debe tener máximo 60 caracteres").run(req);
  await check("numero").matches(/^\d{13,19}$/).withMessage("El número de tarjeta debe tener de 13 a 19 dígitos").bail()
    .custom((v) => luhn(v)).withMessage("El número de tarjeta no es válido").run(req);
  await check("vencimiento").trim().matches(/^(0[1-9]|1[0-2])\/\d{2}$/).withMessage("El vencimiento debe tener el formato MM/AA").bail()
    .custom((v) => {
      const [mes, anio] = v.split("/").map(Number);
      const hoy = new Date();
      // la tarjeta sirve hasta el último día del mes de vencimiento
      return 2000 + anio > hoy.getFullYear() || (2000 + anio === hoy.getFullYear() && mes >= hoy.getMonth() + 1);
    }).withMessage("La tarjeta está vencida").run(req);
  await check("cvv").trim().matches(/^\d{3,4}$/).withMessage("El CVV debe tener 3 o 4 dígitos").run(req);
  return validationResult(req);
}

// Pagar: PAGO SIMULADO, no se hace ningún cargo real.
// Crea el pago y una compra por cada lote del carrito, todo en una transacción.
const pagar = async (req, res) => {
  const valido = await validarTarjeta(req);
  if (!valido.isEmpty()) {
    return vistaPago(req, res, { errores: valido.array(), titular: req.body.titular });
  }
  const codigo_cpr = req.usuario.codigo_cpr;
  const { titular, numero } = req.body;

  let pago;
  try {
    pago = await db.transaction(async (t) => {
      const filas = await miCarrito(codigo_cpr, t);
      // si un apartado venció mientras se llenaba el formulario, no se cobra algo distinto a lo que se vio
      const vistos = String(req.body.lotes || "");
      if (!filas.length || filas.map((f) => f.id_lte).join(",") !== vistos) return null;

      const lotes = filas.map((f) => f.lote);
      const ahora = new Date();
      const nuevo = await Pago.create(
        {
          codigo_cpr,
          total: suma(lotes).toFixed(2),
          metodo: "tarjeta",
          titular,
          ultimos4: numero.slice(-4), // nunca se guarda el número completo ni el CVV
          referencia: idGenera().toUpperCase().slice(-12),
          fecha: ahora,
        },
        { transaction: t }
      );
      await Compra.bulkCreate(
        lotes.map((l) => ({
          id_cmp: l.id_lte,
          codigo_cpr,
          precio_kilo_final: l.precio_kilo_salida,
          precio_total: totalLote(l).toFixed(2),
          fecha: ahora,
          id_pgo: nuevo.id_pgo,
        })),
        { transaction: t }
      );
      await Carrito.destroy({ where: { codigo_cpr }, transaction: t });
      return nuevo;
    });
  } catch (err) {
    if (err.name !== "SequelizeUniqueConstraintError") throw err;
    return res.redirect("/tienda/carrito?aviso=Uno de los lotes ya fue vendido. Revisa tu carrito");
  }
  if (!pago) {
    return res.redirect("/tienda/carrito?aviso=Tu carrito cambió (algún apartado venció). Revísalo antes de pagar");
  }
  res.redirect(`/tienda/pedidos/${pago.id_pgo}?ok=Pago aprobado. ¡Gracias por tu compra!`);
};

const pedidos = async (req, res) => {
  const pagos = await Pago.findAll({
    where: { codigo_cpr: req.usuario.codigo_cpr },
    include: [{ model: Compra, as: "compras", attributes: ["id_cmp", "precio_total"] }],
    order: [["fecha", "DESC"]],
  });
  res.render("tienda/pedidos", { pagos });
};

const comprobante = async (req, res) => {
  const pago = await Pago.findOne({
    // solo sus propios pedidos
    where: { id_pgo: req.params.id, codigo_cpr: req.usuario.codigo_cpr },
    include: [
      { model: Compra, as: "compras", include: [{ model: Lote, as: "lote", include: [conEspecies] }] },
    ],
  });
  if (!pago) return res.redirect("/tienda/pedidos?aviso=Ese pedido no existe");
  res.render("tienda/comprobante", { pago });
};

export { preparar, catalogo, estado, agregar, quitar, verCarrito, verPago, pagar, pedidos, comprobante };
