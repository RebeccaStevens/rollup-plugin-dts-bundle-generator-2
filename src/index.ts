import assert from "node:assert/strict";
import * as fsp from "node:fs/promises";
import * as path from "node:path";

import { type CompilationOptions, type EntryPointConfig, generateDtsBundle } from "dts-bundle-generator";
import type { Plugin } from "rollup";

export type Options = CompilationOptions;

export default function rollupPlugin(options?: Options): Plugin {
  let mut_dts: Map<string, string> | undefined;

  return {
    name: "dts-bundle-generator",

    async renderChunk(code, chunk, outputConfig, meta) {
      // Support chunking once upstream does.
      // https://github.com/timocov/dts-bundle-generator/issues/69
      if (!chunk.isEntry) {
        return;
      }

      if (chunk.facadeModuleId === null) {
        return;
      }

      const dts = mut_dts?.get(chunk.facadeModuleId);
      if (dts === undefined) {
        return;
      }

      const outputFile =
        outputConfig.dir === undefined
          ? (assert(outputConfig.file !== undefined),
            path.join(path.dirname(outputConfig.file), changeToDtsExtension(chunk.fileName)))
          : path.join(outputConfig.dir, changeToDtsExtension(chunk.fileName));

      await fsp.mkdir(path.dirname(outputFile), { recursive: true });
      await fsp.writeFile(outputFile, dts);
      console.info(`created ${outputFile}`);
    },

    renderStart(outputConfig, inputConfig) {
      const inputs: string[] = Array.isArray(inputConfig.input) ? inputConfig.input : Object.values(inputConfig.input);

      const entries = inputs.map(
        (input): EntryPointConfig => ({
          filePath: input,
        }),
      );

      mut_dts = new Map(
        zip(
          inputs.map((input) => path.resolve(input)),
          generateDtsBundle(entries, options),
        ),
      );
    },
  };
}

function changeToDtsExtension(file: string): string {
  // eslint-disable-next-line functional/no-loop-statements
  for (const [js, dts] of [
    [".cjs", ".d.cts"],
    [".mjs", ".d.mts"],
  ] as const) {
    if (file.endsWith(js)) {
      return file.slice(0, -js.length) + dts;
    }
  }

  return `${file.slice(0, -".js".length)}.d.ts`;
}

function zip<T, U>(a: T[], b: U[]): Array<[T, U]> {
  assert(a.length === b.length);
  return a.map((v, i) => [v, b[i]!]);
}
