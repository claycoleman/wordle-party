import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

// const fileRegex = /\.txt$/;

// // function stringPlugin(): Plugin {
// //   return {
// //     name: "transform-file",

// //     transform(code, id) {
// //       console.log({ id });
// //       if (fileRegex.test(id)) {
// //         console.log("passed", code);
// //         return {
// //           code: `export default ${JSON.stringify(code)};`,
// //           map: null,
// //         };
// //       }
// //     },
// //   };
// // }

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(), // passing string type Regular expression
    // stringPlugin(),
  ],
});
