import sharp from 'sharp';

/**
 * Adds a diagonal "icarəpro" watermark to an image buffer.
 * Returns a new buffer (JPEG, quality 90).
 */
export async function addWatermark(inputBuffer: Buffer): Promise<Buffer> {
  const image = sharp(inputBuffer);
  const metadata = await image.metadata();
  const width = metadata.width ?? 800;
  const height = metadata.height ?? 600;

  const fontSize = Math.max(Math.round(width * 0.06), 20);
  const opacity = 0.18;

  // Build a repeating diagonal watermark pattern
  const texts: string[] = [];
  const stepX = fontSize * 8;
  const stepY = fontSize * 4;

  for (let y = -height; y < height * 2; y += stepY) {
    for (let x = -width; x < width * 2; x += stepX) {
      texts.push(
        `<text x="${x}" y="${y}" font-size="${fontSize}" font-family="Arial, sans-serif" font-weight="bold" fill="white" opacity="${opacity}" transform="rotate(-30, ${x}, ${y})">icarəpro</text>`
      );
    }
  }

  const svgOverlay = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${texts.join('')}</svg>`
  );

  return image
    .composite([{ input: svgOverlay, top: 0, left: 0 }])
    .jpeg({ quality: 90 })
    .toBuffer();
}
