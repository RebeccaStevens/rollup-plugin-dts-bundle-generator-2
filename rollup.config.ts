import rollupPluginTypescript from "@rollup/plugin-typescript";
import type { RollupOptions } from "rollup";
import rollupPluginDeassert from "rollup-plugin-deassert";

import pkg from "./package.json" with { type: "json" };
import generateDtsBundle from "./src";

type PackageJSON = typeof pkg & {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

const externalDependencies = [
  ...Object.keys((pkg as PackageJSON).dependencies ?? {}),
  ...Object.keys((pkg as PackageJSON).peerDependencies),
];

export default {
  input: "src/index.ts",

  output: [
    {
      file: pkg.exports.import,
      format: "esm",
      sourcemap: false,
    },
    {
      file: pkg.exports.require,
      format: "cjs",
      sourcemap: false,
    },
  ],

  plugins: [
    rollupPluginTypescript({
      compilerOptions: {
        noCheck: true,
        declaration: false,
        isolatedDeclarations: false,
      },
      tsconfig: "tsconfig.build.json",
    }),
    rollupPluginDeassert({
      include: ["**/*.{js,ts}"],
    }),
    generateDtsBundle({
      preferredConfigPath: "tsconfig.build.json",
    }),
  ],

  treeshake: {
    annotations: true,
    moduleSideEffects: [],
    propertyReadSideEffects: false,
    unknownGlobalSideEffects: false,
  },

  external: (source) => {
    if (source.startsWith("node:") || externalDependencies.some((dep) => source.startsWith(dep))) {
      return true;
    }
    return undefined;
  },
} satisfies RollupOptions;