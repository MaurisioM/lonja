import express from "express";
import dotenv from "dotenv";
import methodOverride from "method-override";
import path from "path";
import cookieParser from "cookie-parser";

import db from "./config/db.js";
import "./models/index.js";
import createInitialAdmin from "./models/config_adm.js";
import migrar from "./models/migraciones.js";
import rutaProteger from "./middleware/protegerRutas.js";
import soloAdmin from "./middleware/soloAdmin.js";
import soloPersonal from "./middleware/soloPersonal.js";
import soloComprador from "./middleware/soloComprador.js";

import router_login from "./routes/login_router.js";
import router_usuario from "./routes/usuario_router.js";
import router_tipo from "./routes/tipo_router.js";
import router_lote from "./routes/lote_router.js";
import router_especie from "./routes/especie_router.js";
import router_comprador from "./routes/comprador_router.js";
import router_compra from "./routes/compra_router.js";
import router_reporte from "./routes/reporte_router.js";
import router_tienda from "./routes/tienda_router.js";

const __dirname = path.resolve();
dotenv.config({ path: ".env", quiet: true });

// hora de México aunque el servidor esté en otra zona (p. ej. Linux en UTC),
// así el reporte diario corta los días a medianoche local
process.env.TZ = process.env.TZ || "America/Mexico_City";

//Crear la aplicación
const app = express();

//accesos a los datos del formulario
app.use(express.urlencoded({ extended: true }));

//habilitar cookie parser
app.use(cookieParser());

// Permite PUT/DELETE vía ?_method=PUT
app.use(methodOverride("_method"));

// Middleware para parsear JSON
app.use(express.json());

// Motor de vistas
app.set("view engine", "ejs");
app.set("views", "./views");

//carpeta publica
app.use(express.static("public"));

//acceso a bootstrap
app.use("/bootstrap", express.static(path.join(__dirname, "public/bootstrap")));

//mensajes y usuario disponibles en todas las vistas
app.use((req, res, next) => {
  res.locals.usuario = null;
  res.locals.ok = req.query.ok || null;
  res.locals.aviso = req.query.aviso || null;
  next();
});

//routing (todo excepto el login queda protegido con el JWT)
app.use("/", router_login);
// administración: solo el personal (admin / usuario), nunca los compradores
app.use("/usuarios", rutaProteger, soloAdmin, router_usuario);
app.use("/tipos", rutaProteger, soloPersonal, router_tipo);
app.use("/lotes", rutaProteger, soloPersonal, router_lote);
app.use("/especies", rutaProteger, soloPersonal, router_especie);
app.use("/compradores", rutaProteger, soloPersonal, router_comprador);
app.use("/compras", rutaProteger, soloPersonal, router_compra);
app.use("/reportes", rutaProteger, soloPersonal, router_reporte);
// tienda en línea: solo compradores
app.use("/tienda", rutaProteger, soloComprador, router_tienda);

//página no encontrada
app.use((req, res) => {
  res.status(404).render("login/confirmacion", {
    pagina: "Página no encontrada",
    mensaje: "La dirección que buscas no existe.",
    enlace: "/inicio",
  });
});

//definiendo el puerto
const port = process.env.PORT_BACKEND || 2800;

(async () => {
  try {
    await db.authenticate();
    console.log("Conexión a la base de datos establecida.");

    // crea las tablas que no existan
    await db.sync();
    await migrar(); // agrega columnas nuevas a tablas que ya existían
    console.log("Modelos sincronizados.");

    //llamar para crear admin y catálogo inicial
    await createInitialAdmin();

    app.listen(port, () => {
      console.log(`Esperando peticiones en el puerto ${port}`);
    });
  } catch (err) {
    console.error("Error al iniciar:", err);
  }
})();
