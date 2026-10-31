import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config({ path: ".env", quiet: true });

const correoRegistro = async (info) => {
  const transport = nodemailer.createTransport({
    host: process.env.CORREO_HOST,
    port: process.env.CORREO_PORT,
    secure: false,
    auth: {
      user: process.env.CORREO_USER,
      pass: process.env.CORREO_PASS,
    },
  });

  const { nombre, email, token } = info;
  const enlace = `${process.env.URL_BACKEND}:${process.env.PORT_BACKEND}/confirmarinscripcion/${token}`;

  await transport.sendMail({
    from: process.env.CORREO_USER,
    to: email,
    subject: "Confirma tu registro en el Sistema Lonja de Veracruz",
    html: `
      <p>Hola ${nombre}, para terminar tu registro por favor confirma tu cuenta.</p>
      <p>Confirma en el siguiente enlace: <a href="${enlace}">Confirmar</a></p>
      <p>Si no solicitaste el registro, por favor ignora el mensaje.</p>
    `,
  });
};

export { correoRegistro };
