import { fileURLToPath } from "node:url";

const frontendDirectory = fileURLToPath(new URL("./frontend/", import.meta.url));

export default {
  root: frontendDirectory,
  publicDir: "public",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
};
