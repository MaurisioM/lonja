-- Sistema Lonja de Veracruz
-- Crea la base de datos. Las tablas las crea la aplicación sola al arrancar (Sequelize),
-- pero aquí queda el diseño relacional por si se quieren crear a mano.

DROP DATABASE IF EXISTS base_lonja;
CREATE DATABASE base_lonja CHARACTER SET utf8mb4;
USE base_lonja;

CREATE TABLE tipo (
  id_tpo SMALLINT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(30) NOT NULL,
  PRIMARY KEY (id_tpo)
);

CREATE TABLE lote (
  id_lte INTEGER NOT NULL AUTO_INCREMENT,
  kilos DECIMAL(10,2) NOT NULL,
  numero_cajas SMALLINT NOT NULL,
  precio_kilo_salida DECIMAL(10,2) NOT NULL,
  fecha DATETIME NOT NULL,
  PRIMARY KEY (id_lte)
);

CREATE TABLE especie (
  id_epe INTEGER NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(25) NOT NULL,
  id_lte INTEGER NOT NULL,
  id_tpo SMALLINT NOT NULL,
  imagen VARCHAR(100) NULL,
  PRIMARY KEY (id_epe),
  FOREIGN KEY (id_lte) REFERENCES lote (id_lte) ON UPDATE CASCADE,
  FOREIGN KEY (id_tpo) REFERENCES tipo (id_tpo) ON UPDATE CASCADE
);

CREATE TABLE comprador (
  codigo_cpr SMALLINT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(15) NOT NULL,
  apellido_paterno VARCHAR(15) NOT NULL,
  apellido_materno VARCHAR(15) NULL,
  direccion VARCHAR(200) NOT NULL,
  correo VARCHAR(80) NOT NULL,
  PRIMARY KEY (codigo_cpr),
  UNIQUE KEY correo (correo)
);

-- id_cmp es PK y FK hacia lote: cada lote se compra una sola vez
CREATE TABLE compra (
  id_cmp INTEGER NOT NULL,
  codigo_cpr SMALLINT NOT NULL,
  precio_kilo_final DECIMAL(10,2) NOT NULL,
  precio_total DECIMAL(12,2) NOT NULL,
  fecha DATETIME NOT NULL,
  id_pgo INTEGER NULL, -- pago en línea (NULL = compra registrada en mostrador)
  PRIMARY KEY (id_cmp),
  FOREIGN KEY (id_cmp) REFERENCES lote (id_lte) ON UPDATE CASCADE,
  FOREIGN KEY (codigo_cpr) REFERENCES comprador (codigo_cpr) ON UPDATE CASCADE
);

-- Pago en línea (simulado): agrupa las compras de un carrito. No guarda la tarjeta completa ni el CVV
CREATE TABLE pago (
  id_pgo INTEGER NOT NULL AUTO_INCREMENT,
  codigo_cpr SMALLINT NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  metodo VARCHAR(20) NOT NULL DEFAULT 'tarjeta',
  titular VARCHAR(60) NOT NULL,
  ultimos4 VARCHAR(4) NOT NULL,
  referencia VARCHAR(30) NOT NULL,
  fecha DATETIME NOT NULL,
  PRIMARY KEY (id_pgo),
  UNIQUE KEY referencia (referencia),
  FOREIGN KEY (codigo_cpr) REFERENCES comprador (codigo_cpr) ON UPDATE CASCADE
);

-- Carrito: id_lte es PK, así un lote solo puede estar apartado por un comprador a la vez
CREATE TABLE carrito (
  id_lte INTEGER NOT NULL,
  codigo_cpr SMALLINT NOT NULL,
  agregado DATETIME NOT NULL,
  PRIMARY KEY (id_lte),
  FOREIGN KEY (id_lte) REFERENCES lote (id_lte) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (codigo_cpr) REFERENCES comprador (codigo_cpr) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Personal autorizado (control de acceso)
CREATE TABLE usuario (
  id INTEGER NOT NULL AUTO_INCREMENT,
  usuario VARCHAR(30) NOT NULL,
  nombre VARCHAR(40) NOT NULL,
  apellido VARCHAR(40) NOT NULL,
  email VARCHAR(80) NOT NULL,
  password VARCHAR(255) NOT NULL,
  confirmar TINYINT(1) DEFAULT 0,
  rol VARCHAR(15) NOT NULL DEFAULT 'usuario', -- admin | usuario | comprador
  codigo_cpr SMALLINT NULL, -- solo rol comprador: a qué comprador pertenece la cuenta
  token VARCHAR(255) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY usuario (usuario),
  UNIQUE KEY email (email)
);
