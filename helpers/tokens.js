import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config({ path: ".env", quiet: true });

// token para confirmar la cuenta por correo
const idGenera = () => Math.random().toString(32).substring(2) + Date.now().toString(32);

// token de sesión (JWT)
const JWTGenera = (info) =>
  jwt.sign(
    {
      id: info.id,
      nombre: info.email,
    },
    process.env.SC_JWT,
    {
      expiresIn: "1d",
    }
  );

export { idGenera, JWTGenera };
