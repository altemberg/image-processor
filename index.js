const Fastify = require("fastify");
const sharp = require("sharp");
const axios = require("axios");

const app = Fastify();

app.post("/crop", async (req, reply) => {
  const { imageUrl } = req.body;

  const response = await axios.get(imageUrl, {
    responseType: "arraybuffer",
  });

  const output = await sharp(response.data)
    .trim()
    .extend({
      top: 60,
      bottom: 60,
      left: 60,
      right: 60,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  reply
    .header("Content-Type", "image/png")
    .send(output);
});

app.listen({
  port: 3001,
  host: "0.0.0.0",
});