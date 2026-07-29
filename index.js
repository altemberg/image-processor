const Fastify = require("fastify");
const sharp = require("sharp");
const axios = require("axios");

const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const { execFile } = require("child_process");
const { promisify } = require("util");

const exec = promisify(execFile);

const app = Fastify({
  logger: true,
});

app.get("/", async () => {
  return {
    status: "ok",
    service: "image-processor",
  };
});

app.post("/crop", async (request, reply) => {
  let originalFile;
  let compressedFile;

  try {
    let { imageUrl } = request.body;

    if (!imageUrl) {
      return reply.status(400).send({
        error: "imageUrl é obrigatório",
      });
    }

    imageUrl = imageUrl.trim();

    if (imageUrl.startsWith("=")) {
      imageUrl = imageUrl.substring(1);
    }

    const response = await axios.get(imageUrl, {
      responseType: "arraybuffer",
    });

    const id = crypto.randomUUID();

    originalFile = path.join(os.tmpdir(), `${id}.png`);
    compressedFile = path.join(os.tmpdir(), `${id}-compressed.png`);

    await sharp(response.data)
      .trim()

      .resize({
        width: 1024,
        height: 1024,
        fit: "inside",
        withoutEnlargement: true,
      })

      .extend({
        top: 60,
        bottom: 60,
        left: 60,
        right: 60,
        background: {
          r: 0,
          g: 0,
          b: 0,
          alpha: 0,
        },
      })

      .withMetadata(false)

      .png({
        compressionLevel: 9,
        palette: false,
      })

      .toFile(originalFile);

    let output;

    try {
      await exec("pngquant", [
        "--quality=80-100",
        "--speed=1",
        "--force",
        "--output",
        compressedFile,
        originalFile,
      ]);

      output = await fs.readFile(compressedFile);

      request.log.info("Imagem comprimida com pngquant");
    } catch (err) {
      request.log.warn(
        "pngquant falhou. Retornando imagem gerada pelo Sharp."
      );

      output = await fs.readFile(originalFile);
    }

    reply
      .header("Content-Type", "image/png")
      .send(output);

  } catch (err) {
    request.log.error(err);

    reply.status(500).send({
      error: err.message,
    });
  } finally {
    await Promise.allSettled([
      originalFile ? fs.unlink(originalFile) : Promise.resolve(),
      compressedFile ? fs.unlink(compressedFile) : Promise.resolve(),
    ]);
  }
});

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3001;

    await app.listen({
      host: "0.0.0.0",
      port,
    });

    console.log(`🚀 Image Processor rodando na porta ${port}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();