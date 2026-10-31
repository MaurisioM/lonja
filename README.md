# Sistema Lonja de Veracruz

Sistema web para registrar y gestionar las compras diarias de la Lonja de Veracruz.
Hecho con Node.js + Express + EJS + Sequelize + MariaDB, con la misma estructura que vimos en clase
(registro-administración / web token).

## Requerimientos cubiertos

1. **Registro y almacenamiento de ventas** — Lotes, especies (con imagen), compradores y compras.
   Cada compra valida el lote, el comprador y el precio; el precio total se calcula solo (kilos × precio final).
   Un lote no se puede comprar dos veces.
2. **Control de acceso** — Login con JSON Web Token guardado en una cookie `httpOnly`. Todas las rutas,
   excepto el login y el registro, están protegidas (`middleware/protegerRutas.js`).
   Autorización por rol (`middleware/soloAdmin.js`):
   - `admin`: todo, más administrar usuarios y eliminar registros.
   - `usuario`: capturar y editar compras, lotes, especies, compradores y ver reportes.
   El registro público envía un correo de confirmación (nodemailer); el admin también puede crear
   usuarios ya confirmados o activar cuentas.
3. **Reporte diario** — `Reporte diario` en el menú: detalle de las compras del día elegido,
   totales (kilos, cajas, importe) y resumen por comprador. Se puede imprimir o guardar como PDF.

## Cómo correrlo

1. Arranca MariaDB y crea la base de datos (en HeidiSQL o la consola):
   ```sql
   CREATE DATABASE base_lonja;
   ```
   (o ejecuta `base_lonja.sql`, que también crea las tablas).
2. Revisa el archivo `.env`: pon tu usuario y clave de MariaDB (`BD_USUARIO`, `BD_CLAVE`)
   y, si quieres que salgan los correos de confirmación, tu Gmail y su contraseña de aplicación
   (`CORREO_USER`, `CORREO_PASS`).
3. Instala y arranca:
   ```
   npm install
   npm run server
   ```
4. Abre http://localhost:2800 e inicia sesión con el administrador:
   - Usuario: `administrador`
   - Password: `FESAdministrador4`

Al arrancar por primera vez se crean las tablas, el administrador y los tipos
(Pescado, Crustáceo, Molusco, Cefalópodo).

## Correrlo en Linux (Ubuntu / Debian)

```bash
# 1. Node.js 20 o más nuevo, MariaDB y git
sudo apt update
sudo apt install -y mariadb-server git curl
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# 2. Base de datos y un usuario para la app
#    (en Linux root entra por socket, no con contraseña, así que se crea un usuario propio)
sudo mariadb -e "CREATE DATABASE base_lonja;
  CREATE USER 'lonja'@'localhost' IDENTIFIED BY 'tu_clave';
  GRANT ALL PRIVILEGES ON base_lonja.* TO 'lonja'@'localhost';
  FLUSH PRIVILEGES;"

# 3. Código y configuración
git clone <url-del-repo> sistema-lonja
cd sistema-lonja
cp .env.example .env
nano .env        # BD_USUARIO=lonja, BD_CLAVE=tu_clave, ADMIN_PASSWORD, SC_JWT, correo...

# 4. Instalar y arrancar
npm install
npm start        # o: npm run server  (con nodemon, para desarrollo)
```

Abre `http://IP-del-servidor:2800`. Si el servidor tiene firewall: `sudo ufw allow 2800`.
Si los correos de confirmación se van a abrir desde otra máquina, cambia `URL_BACKEND`
en `.env` por la IP o el dominio del servidor.

Para dejarla corriendo aunque cierres la terminal (y que arranque sola al reiniciar):

```bash
sudo npm install -g pm2
pm2 start index.js --name lonja
pm2 save && pm2 startup     # sigue la instrucción que imprime
```

> El archivo `.env` **no** se sube al repositorio (tiene contraseñas). Por eso existe
> `.env.example`: en cada máquina se copia y se llena.

## Flujo de uso

Nuevo lote → agregar sus especies → registrar comprador → registrar compra → ver el reporte diario.

## Estructura

```
config/        conexión a la base (Sequelize)
controllers/   lógica de cada módulo
helpers/       correo, tokens (JWT), fechas, subida de imágenes
middleware/    protegerRutas (JWT) y soloAdmin (rol)
models/        Tipo, Lote, Especie, Comprador, Compra, Usuario + asociaciones
routes/        rutas de cada módulo
views/         vistas EJS con Bootstrap
public/        bootstrap, css e imágenes de especies
```
