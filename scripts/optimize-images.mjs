// Responsive, modern-format copies of the site's images (run: `npm run images`).
// Outputs are committed: the static export serves them as-is (no image server).
//   assets/photo/shivam-gupta-original.jpg → public/img/shivam-gupta-{480,800,1100}.{avif,webp},
//     public/img/shivam-gupta-72.webp (header avatar) and public/shivam-gupta.jpg (recompressed
//     full size, kept at that URL for the Person schema / OG image).
//   public/shots/<id>.jpg → public/img/shots/<id>-{640,1280}.webp
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "public/img");
await mkdir(path.join(out, "shots"), { recursive: true });

const photo = path.join(root, "assets/photo/shivam-gupta-original.jpg");
for (const w of [480, 800, 1100]) {
  const base = sharp(photo).rotate().resize({ width: w });
  await base.clone().avif({ quality: 55, effort: 6 }).toFile(path.join(out, `shivam-gupta-${w}.avif`));
  await base.clone().webp({ quality: 78 }).toFile(path.join(out, `shivam-gupta-${w}.webp`));
}
// Avatar: a square around the face (the portrait is 1159x1358; the face sits in its upper middle).
await sharp(photo)
  .rotate()
  .extract({ left: 255, top: 110, width: 640, height: 640 })
  .resize({ width: 144, height: 144 })
  .webp({ quality: 80 })
  .toFile(path.join(out, "shivam-gupta-144.webp"));
await sharp(photo).rotate().jpeg({ quality: 82, progressive: true, mozjpeg: true }).toFile(path.join(root, "public/shivam-gupta.jpg"));

const shots = path.join(root, "public/shots");
for (const f of (await readdir(shots)).filter((f) => f.endsWith(".jpg"))) {
  const id = f.replace(/\.jpg$/, "");
  for (const w of [640, 1280]) {
    await sharp(path.join(shots, f)).resize({ width: w, withoutEnlargement: true }).webp({ quality: 74 }).toFile(path.join(out, "shots", `${id}-${w}.webp`));
  }
}
console.log("images written to public/img");
