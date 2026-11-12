# Sistema Lonja de Veracruz

Sistema web para registrar y gestionar las compras diarias de la Lonja de Veracruz.
Hecho con **Node.js + Express + EJS + Sequelize + MariaDB**, con la misma estructura que vimos en clase
(registro-administración / web token).

---

## Índice

1. [Qué hace](#qué-hace)
2. [Correrlo en Linux, paso a paso](#correrlo-en-linux-paso-a-paso)
3. [Dejarlo corriendo siempre (pm2)](#dejarlo-corriendo-siempre-pm2)
4. [Actualizar cuando haya cambios en el repo](#actualizar-cuando-haya-cambios-en-el-repo)
5. [Problemas comunes](#problemas-comunes)
6. [Correrlo en Windows](#correrlo-en-windows)
7. [Cómo se usa](#cómo-se-usa)
8. [Estructura del proyecto](#estructura-del-proyecto)

---

## Qué hace

1. **Registro y almacenamiento de ventas**: lotes, especies (con imagen), compradores y compras.
   Cada compra valida el lote, el comprador y el precio. El precio total se calcula solo
   (kilos × precio final) y un lote no se puede comprar dos veces.
2. **Control de acceso**: login con JSON Web Token guardado en una cookie `httpOnly`. Todas las páginas,
   menos el login y el registro, piden sesión (`middleware/protegerRutas.js`).
   Hay tres roles y todos entran por el mismo login:
   - `admin`: todo, más administrar usuarios y eliminar registros (`middleware/soloAdmin.js`).
   - `usuario`: capturar y editar compras, lotes, especies y compradores, y ver reportes.
   - `comprador`: solo la tienda en línea (`middleware/soloComprador.js`); no puede entrar a la
     administración (`middleware/soloPersonal.js`).

   El registro público manda un correo de confirmación (nodemailer). El admin también puede crear
   usuarios ya confirmados o activar cuentas.
3. **Reportes por día o por rango de fechas**: detalle de las compras del periodo elegido, con totales
   (kilos, cajas, importe), resumen por día y por comprador, y si la compra fue en línea o en mostrador.
   Se puede imprimir o guardar como PDF.
4. **Tienda en línea para compradores**: el comprador crea su cuenta, ve los lotes en venta (cada lote
   es un artículo y se vende completo al precio de salida), los agrega a su carrito y paga.
   - Un lote que está en el carrito de un comprador aparece **No disponible** para los demás.
     Lo garantiza la base de datos: en la tabla `carrito` la llave primaria es el lote.
   - El apartado dura `CARRITO_MINUTOS` (30 por defecto, se cambia en `.env`); si no se paga, el lote
     vuelve a quedar disponible.
   - El pago es **simulado**: valida la tarjeta (dígito verificador, vencimiento y CVV) pero no hace
     ningún cargo. Solo se guardan los últimos 4 dígitos y un folio. Tarjeta de prueba:
     `4242 4242 4242 4242`, cualquier vencimiento futuro y cualquier CVV.

---

## Correrlo en Linux, paso a paso

Probado para **Ubuntu 22.04 / 24.04 y Debian 12**. Al final de cada paso hay notas para Fedora y Arch.
Todos los comandos se escriben en una terminal. Los que empiezan con `sudo` te piden tu contraseña de Linux.

### Paso 1. Actualizar el sistema e instalar herramientas básicas

```bash
sudo apt update
sudo apt install -y git curl ca-certificates openssl
```

> Fedora: `sudo dnf install -y git curl openssl`
> Arch: `sudo pacman -Syu --needed git curl openssl`

### Paso 2. Instalar Node.js (versión 22)

El Node que trae `apt` suele ser muy viejo, así que se instala desde NodeSource:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

Comprueba que quedó instalado (debe decir `v22.x` o más nuevo, y una versión de npm):

```bash
node -v
npm -v
```

> Fedora: `sudo dnf install -y nodejs npm`
> Arch: `sudo pacman -S --needed nodejs npm`

### Paso 3. Instalar MariaDB y dejarla encendida

```bash
sudo apt install -y mariadb-server
sudo systemctl enable --now mariadb
```

`enable --now` la enciende ahora y hace que arranque sola cada vez que prendas la máquina.
Comprueba que está corriendo (debe decir `active (running)`; sal con la tecla `q`):

```bash
sudo systemctl status mariadb
```

> Fedora: `sudo dnf install -y mariadb-server && sudo systemctl enable --now mariadb`
> Arch:
> ```bash
> sudo pacman -S --needed mariadb
> sudo mariadb-install-db --user=mysql --basedir=/usr --datadir=/var/lib/mysql
> sudo systemctl enable --now mariadb
> ```

### Paso 4. Crear la base de datos y un usuario para la app

En Linux el usuario `root` de MariaDB entra con `sudo`, no con contraseña, así que la app
**no puede** usar root. Hay que crearle un usuario propio.

Cambia `MiClaveSegura123` por la contraseña que quieras y **anótala**, porque la vas a usar en el paso 6:

```bash
sudo mariadb -e "
CREATE DATABASE IF NOT EXISTS base_lonja CHARACTER SET utf8mb4;
CREATE USER IF NOT EXISTS 'lonja'@'localhost' IDENTIFIED BY 'MiClaveSegura123';
GRANT ALL PRIVILEGES ON base_lonja.* TO 'lonja'@'localhost';
FLUSH PRIVILEGES;"
```

Comprueba que el usuario nuevo puede entrar (te pide la contraseña; debe aparecer `base_lonja`):

```bash
mariadb -u lonja -p -e "SHOW DATABASES;"
```

> Las tablas **no** se crean a mano: la aplicación las crea sola la primera vez que arranca.
> (Si de todos modos las quieres ver en SQL, están en `base_lonja.sql`.)

### Paso 5. Descargar el proyecto

```bash
cd ~
git clone https://github.com/MaurisioM/lonja.git
cd lonja
```

A partir de aquí **todos los comandos se corren dentro de la carpeta `lonja`**.

### Paso 6. Crear el archivo de configuración `.env`

El `.env` tiene contraseñas, por eso no viene en el repositorio. Se crea a partir de la plantilla:

```bash
cp .env.example .env
```

Genera una firma secreta para los tokens de sesión (copia el texto que salga):

```bash
openssl rand -hex 32
```

Abre el archivo para editarlo:

```bash
nano .env
```

Déjalo así, cambiando lo que está en los comentarios:

```ini
BD_NOMBRE=base_lonja
BD_USUARIO=lonja
BD_CLAVE=MiClaveSegura123          # la contraseña que pusiste en el paso 4
BD_DIALEC='mariadb'
BD_HOST=127.0.0.1
BD_PORT=3306

ADMIN_USER=administrador           # usuario con el que vas a entrar la primera vez
ADMIN_PASSWORD=FESAdministrador4   # su contraseña (cámbiala si quieres)

CORREO_HOST='smtp.gmail.com'
CORREO_PORT='587'
CORREO_USER='tu_correo@gmail.com'  # opcional, ver nota abajo
CORREO_PASS='xxxxxxxxxxxxxxxx'     # contraseña de aplicación de Gmail (16 letras)

URL_BACKEND=http://localhost       # o http://IP-del-servidor si entras desde otra compu
PORT_BACKEND=2800

SC_JWT=pega_aqui_lo_que_salio_de_openssl
```

Para guardar en `nano`: **Ctrl + O**, luego **Enter**, y para salir **Ctrl + X**.

> **Sobre el correo:** solo se usa para confirmar las cuentas de quien se registra solo.
> Si no lo configuras, el sistema funciona igual: el registro avisa que no se pudo mandar el correo
> y el administrador activa la cuenta desde el menú **Usuarios**.
> Para sacar la contraseña de aplicación de Gmail: activa la verificación en dos pasos y entra a
> https://myaccount.google.com/apppasswords.

> **Importante:** `ADMIN_USER` y `ADMIN_PASSWORD` solo se usan **la primera vez** para crear al admin.
> Si después los cambias en el `.env`, no cambia la contraseña del admin que ya existe.
> Para eso usa **Usuarios → Editar** dentro del sistema.

### Paso 7. Instalar las dependencias

```bash
npm install
```

Tarda un poco y crea la carpeta `node_modules`. Los avisos de `npm audit` no impiden que funcione.

### Paso 8. Arrancar la aplicación

```bash
npm start
```

Si todo está bien, verás:

```
Conexión a la base de datos establecida.
Modelos sincronizados.
Usuario administrador inicial creado exitosamente.
Catálogo de tipos inicial creado.
Esperando peticiones en el puerto 2800
```

La terminal se queda ocupada mientras la app corre. Para detenerla: **Ctrl + C**.

> Si vas a modificar el código, usa `npm run server` en lugar de `npm start`: se reinicia solo con cada cambio.

### Paso 9. Abrirla en el navegador

- En la misma máquina: **http://localhost:2800**
- Desde otra computadora de la red: **http://IP-del-servidor:2800**
  (la IP la ves con `hostname -I`)

Entra con lo que pusiste en el `.env`:

- **Usuario:** `administrador`
- **Password:** `FESAdministrador4`

Si entras desde otra computadora y no carga, abre el puerto en el firewall:

```bash
sudo ufw allow 2800/tcp
```

> Fedora: `sudo firewall-cmd --add-port=2800/tcp --permanent && sudo firewall-cmd --reload`

### Resumen (todo junto, Ubuntu/Debian)

Para copiar y pegar de una vez (cambia la contraseña antes de pegarlo):

```bash
sudo apt update && sudo apt install -y git curl ca-certificates openssl mariadb-server
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo systemctl enable --now mariadb
sudo mariadb -e "CREATE DATABASE IF NOT EXISTS base_lonja CHARACTER SET utf8mb4;
CREATE USER IF NOT EXISTS 'lonja'@'localhost' IDENTIFIED BY 'MiClaveSegura123';
GRANT ALL PRIVILEGES ON base_lonja.* TO 'lonja'@'localhost'; FLUSH PRIVILEGES;"
cd ~ && git clone https://github.com/MaurisioM/lonja.git && cd lonja
cp .env.example .env
sed -i "s/^BD_USUARIO=.*/BD_USUARIO=lonja/; s/^BD_CLAVE=.*/BD_CLAVE=MiClaveSegura123/; s/^ADMIN_PASSWORD=.*/ADMIN_PASSWORD=FESAdministrador4/; s/^SC_JWT=.*/SC_JWT=$(openssl rand -hex 32)/" .env
npm install
npm start
```

---

## Dejarlo corriendo siempre (pm2)

Con `npm start` la app se apaga al cerrar la terminal. Para dejarla corriendo en segundo plano
y que arranque sola al reiniciar la máquina:

```bash
sudo npm install -g pm2
cd ~/lonja
pm2 start index.js --name lonja
pm2 save
pm2 startup
```

`pm2 startup` imprime un comando que empieza con `sudo env PATH=...`: **cópialo y ejecútalo**.

Comandos útiles:

| Para…                       | Comando              |
|-----------------------------|----------------------|
| Ver si está corriendo       | `pm2 status`         |
| Ver los mensajes / errores  | `pm2 logs lonja`     |
| Reiniciarla                 | `pm2 restart lonja`  |
| Detenerla                   | `pm2 stop lonja`     |
| Quitarla de pm2             | `pm2 delete lonja`   |

> pm2 debe arrancarse **desde la carpeta `lonja`**, porque ahí está el `.env` y las imágenes.

---

## Actualizar cuando haya cambios en el repo

```bash
cd ~/lonja
git pull
npm install
pm2 restart lonja     # o, si no usas pm2: Ctrl + C y otra vez npm start
```

Tu `.env`, la base de datos y las imágenes subidas no se pierden al actualizar.

---

## Problemas comunes

| Mensaje                                                       | Qué pasa y cómo se arregla |
|---------------------------------------------------------------|----------------------------|
| `connect ECONNREFUSED 127.0.0.1:3306`                         | MariaDB está apagada: `sudo systemctl start mariadb` |
| `Access denied for user 'lonja'@'localhost'`                  | Usuario o clave del `.env` no coinciden con el paso 4. Revisa `BD_USUARIO` y `BD_CLAVE`, o repite el paso 4. |
| `Access denied for user 'root'@'localhost'`                   | Estás usando root. En Linux usa el usuario `lonja` del paso 4. |
| `Unknown database 'base_lonja'`                               | No se creó la base: repite el paso 4. |
| `EADDRINUSE: address already in use :::2800`                  | La app ya está corriendo (quizá en pm2: `pm2 status`), u otro programa usa el puerto. Cambia `PORT_BACKEND` en el `.env`. |
| `node: command not found` o error de sintaxis al arrancar     | Node no está instalado o es muy viejo. Repite el paso 2 (`node -v` debe ser 20 o más). |
| `Cannot find package 'express'`                               | Faltó `npm install` (paso 7). |
| No puedo entrar con el admin                                  | Usa el `ADMIN_USER`/`ADMIN_PASSWORD` que tenía el `.env` **la primera vez** que arrancó. |
| Me saca de la sesión                                          | La sesión dura 1 hora; vuelve a iniciar sesión. |
| No se suben las imágenes de especies                          | La carpeta `public/img/especies` necesita permisos de escritura: `chmod -R u+w public/img/especies` |
| Desde otra compu no carga                                     | Abre el puerto (paso 9) y usa la IP del servidor, no `localhost`. |
| El correo de confirmación no llega                            | Revisa `CORREO_USER` y `CORREO_PASS` (contraseña de aplicación, no la normal). Mientras, el admin puede activar la cuenta en **Usuarios**. |

**Empezar de cero** (borra todos los datos):

```bash
sudo mariadb -e "DROP DATABASE base_lonja; CREATE DATABASE base_lonja CHARACTER SET utf8mb4;"
rm -f public/img/especies/*.{jpg,jpeg,png,gif,webp}
npm start
```

---

## Correrlo en Windows

1. Instala Node.js y MariaDB (por ejemplo con `winget install OpenJS.NodeJS.LTS MariaDB.Server`).
2. Arranca MariaDB y crea la base (en HeidiSQL o en la consola `mariadb -u root`):
   ```sql
   CREATE DATABASE base_lonja;
   ```
3. Copia `.env.example` como `.env` y pon tus datos. Si tu root no tiene contraseña:
   `BD_USUARIO=root` y `BD_CLAVE=` vacío.
4. En la carpeta del proyecto:
   ```
   npm install
   npm run server
   ```
5. Abre http://localhost:2800.

---

## Cómo se usa

Primera vez:

1. **Catálogos → Compradores → Nuevo comprador**: registra a los compradores.
2. **Lotes → Nuevo lote**: kilos, cajas, precio de salida por kilo y fecha.
3. Al guardar el lote te lleva a **agregar sus especies** (nombre, tipo e imagen).
   Usa *Guardar y agregar otra* si el lote trae varias especies.
4. **Compras → Registrar compra**: eliges el lote, el comprador y el precio final por kilo.
   El total se calcula solo.
5. **Reportes**: elige *Por día* o *Por rango de fechas*, genera el reporte y usa *Imprimir / PDF*.

Compradores (tienda en línea):

1. En el login, **Soy comprador: crear mi cuenta**. Llega un correo para confirmar la cuenta
   (si el correo no está configurado, el admin la activa en **Usuarios → Activar**).
2. Entra con el mismo login: el sistema lo manda directo a la tienda.
3. **Agregar al carrito** aparta el lote; los demás compradores lo ven como *No disponible*.
4. **Mi carrito → Pagar**: llena los datos de la tarjeta. Al aprobarse se registra la compra,
   el lote queda vendido y se muestra el comprobante (también en **Mis pedidos**).

Las compras en línea aparecen en **Compras** y en los reportes marcadas como *En línea*.
Mientras un lote está en el carrito de un comprador, el personal lo ve como *Apartado* y no puede venderlo.

Como admin, en **Usuarios** puedes dar de alta al personal (rol `usuario` o `admin`),
activar o desactivar cuentas y cambiar contraseñas. Las contraseñas se guardan cifradas con bcrypt,
así que no se pueden ver, solo cambiar.

Al arrancar la primera vez se crean solos los tipos: Pescado, Crustáceo, Molusco y Cefalópodo
(se pueden editar en **Catálogos → Tipos de especie**).

---

## Estructura del proyecto

```
config/        conexión a la base (Sequelize)
controllers/   lógica de cada módulo
helpers/       correo, tokens (JWT), fechas, subida de imágenes, carrito (vencimiento de apartados)
middleware/    protegerRutas (JWT), soloAdmin, soloPersonal y soloComprador (roles)
models/        Tipo, Lote, Especie, Comprador, Compra, Carrito, Pago, Usuario + asociaciones
               migraciones.js agrega las columnas nuevas si la base ya existía
routes/        rutas de cada módulo
views/         vistas EJS con Bootstrap
public/        bootstrap, css e imágenes de especies
base_lonja.sql diseño de las tablas en SQL
.env.example   plantilla de configuración
```
