import dotenv from "dotenv";
import { Usuario, Tipo } from "./index.js";
dotenv.config({ path: ".env", quiet: true });

async function createInitialAdmin() {
  const adminUser = process.env.ADMIN_USER;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUser || !adminPassword) {
    console.warn("No se definieron ADMIN_USER o ADMIN_PASSWORD. Saltando creación de admin.");
  } else {
    try {
      // Verificar si el usuario ya existe para no duplicarlo
      const existe = await Usuario.findOne({ where: { usuario: adminUser } });
      if (existe) {
        console.log("El usuario administrador ya existe. No se requiere acción.");
      } else {
        // el hook beforeCreate cifra la contraseña con bcrypt
        await Usuario.create({
          usuario: adminUser,
          nombre: "Administrador",
          apellido: "Lonja",
          email: "admin@lonjaveracruz.mx",
          password: adminPassword,
          rol: "admin",
          confirmar: true,
        });
        console.log("Usuario administrador inicial creado exitosamente.");
      }
    } catch (error) {
      console.error("Error al crear el usuario administrador inicial:", error);
    }
  }

  // Catálogo inicial de tipos (solo si la tabla está vacía)
  if ((await Tipo.count()) === 0) {
    await Tipo.bulkCreate([
      { nombre: "Pescado" },
      { nombre: "Crustáceo" },
      { nombre: "Molusco" },
      { nombre: "Cefalópodo" },
    ]);
    console.log("Catálogo de tipos inicial creado.");
  }
}

export default createInitialAdmin;
