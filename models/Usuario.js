import { DataTypes } from "sequelize";
import db from "../config/db.js";
import bcrypt from "bcryptjs";

// Personal autorizado para usar el sistema (no forma parte del diseño de la lonja,
// es la tabla que necesita el control de acceso)
const Usuario = db.define(
  "Usuario",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    usuario: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
    },
    nombre: {
      type: DataTypes.STRING(40),
      allowNull: false,
    },
    apellido: {
      type: DataTypes.STRING(40),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(80),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    confirmar: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    rol: {
      // "admin" o "usuario"
      type: DataTypes.STRING(15),
      allowNull: false,
      defaultValue: "usuario",
    },
    token: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "usuario",
    timestamps: false,
    hooks: {
      beforeCreate: async function (usuario) {
        const rep = await bcrypt.genSalt(10);
        usuario.password = await bcrypt.hash(usuario.password, rep);
      },
      // solo se vuelve a cifrar si la contraseña cambió
      beforeUpdate: async function (usuario) {
        if (usuario.changed("password")) {
          const rep = await bcrypt.genSalt(10);
          usuario.password = await bcrypt.hash(usuario.password, rep);
        }
      },
    },
    scopes: {
      eliminarClave: {
        attributes: {
          exclude: ["token", "password", "confirmar"],
        },
      },
    },
  }
);

Usuario.prototype.verificandoClave = function (password) {
  return bcrypt.compareSync(password, this.password);
};

export default Usuario;
