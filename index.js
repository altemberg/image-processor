const Fastify = require("fastify");
const sharp = require("sharp");
const axios = require("axios");

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

    const output = await sharp(response.data)
      .trim()

      // limita o tamanho máximo
      .resize({
        width: 1024,
        height: 1024,
        fit: "inside",
        withoutEnlargement: true,
      })

      // adiciona margem
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

      // remove metadata EXIF
      .withMetadata(false)

      // png otimizado
      .png({
        compressionLevel: 9,
        effort: 10,
        palette: true,
        quality: 85,
      })

      .toBuffer();

    reply
      .header("Content-Type", "image/png")
      .send(output);

  } catch (err) {
    request.log.error(err);

    reply.status(500).send({
      error: err.message,
    });
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