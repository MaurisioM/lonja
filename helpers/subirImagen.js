import multer from "multer";
import path from "path";

// Guarda la imagen de la especie en public/img/especies
const almacenamiento = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/img/especies"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, Date.now().toString(32) + Math.random().toString(32).substring(2, 8) + ext);
  },
});

const subirImagen = multer({
  storage: almacenamiento,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req, file, cb) => {
    const permitido = /\.(jpe?g|png|gif|webp)$/i.test(file.originalname);
    cb(permitido ? null : new Error("Solo se permiten imágenes (jpg, png, gif, webp)"), permitido);
  },
}).single("imagen");

// Envuelve multer para que un error de archivo no tumbe la petición
const imagenEspecie = (req, res, next) => {
  subirImagen(req, res, (err) => {
    if (err) req.errorImagen = err.message;
    next();
  });
};

export default imagenEspecie;
