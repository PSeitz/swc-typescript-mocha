


import deepClone from "lodash.clonedeep";
import sourceMapSupport from "source-map-support";
import convertSourceMap from "convert-source-map";
import escapeRegExp from "lodash.escaperegexp";
import * as swc from "@swc/core";
import { addHook } from "pirates";
import fs from "fs";
import path from "path";

export interface InputOptions extends TransformOptions {
  extensions?: string[];
}

export interface TransformOptions extends swc.Options {
  only?: FilePattern;
  ignore?: FilePattern;
}

/**
 * TODO:
 */
export type FilePattern = any;

const maps: { [src: string]: string } = {};
let transformOpts: TransformOptions = {};
let piratesRevert: (() => void) | null = null;

function installSourceMapSupport() {
  sourceMapSupport.install({
    handleUncaughtExceptions: false,
    environment: "node",
    retrieveSourceMap(source) {
      const map = maps && maps[source];
      if (map) {
        return {
          url: null as any,
          map: map
        };
      } else {
        return null;
      }
    }
  });
}

function mtime(filename: string) {
  return +fs.statSync(filename).mtime;
}

function compile(code: string | any, filename: string) {
  // merge in base options and resolve all the plugins and presets relative to this file
  const opts = {
    sourceRoot: path.dirname(filename),
    ...deepClone(transformOpts),
    filename
  };

  if (typeof code !== "string") {
    code = code.toString();
  }
  delete opts.only;
  delete opts.ignore;
  const output: swc.Output = swc.transformSync(code, {
    ...opts,
    sourceMaps: opts.sourceMaps === undefined ? "both" : opts.sourceMaps
  });

  if (output.map) {
    if (Object.keys(maps).length === 0) {
      installSourceMapSupport();
    }
    const map = JSON.parse(output.map);
    map.sourcesContent=[map.sources];
    map.sources=["index.ts"];
    output.map = JSON.stringify(map);

    maps[filename] = output.map;
    output.code += "\n" + convertSourceMap.fromJSON(output.map).toComment();
  }

  return output.code;
}

let compiling = false;

function compileHook(code: string, filename: string) {
  if (compiling) return code;

  try {
    compiling = true;
    return compile(code, filename);
  } finally {
    compiling = false;
  }
}

function hookExtensions(exts: readonly string[]) {
  if (piratesRevert) piratesRevert();
  piratesRevert = addHook(compileHook, { exts: exts as string[], ignoreNodeModules: true });
}

export function revert() {
  if (piratesRevert) piratesRevert();
}

register();

export default function register(opts: InputOptions = {}) {
  // Clone to avoid mutating the arguments object with the 'delete's below.
  opts = {
    ...opts
  };
  hookExtensions(opts.extensions || swc.DEFAULT_EXTENSIONS);

  delete opts.extensions;

  transformOpts = {
    ...opts,
    caller: {
      name: "@swc/register",
      ...(opts.caller || {})
    }
  };

  let { cwd = "." } = transformOpts;

  // Ensure that the working directory is resolved up front so that
  // things don't break if it changes later.
  cwd = transformOpts.cwd = path.resolve(cwd);

  if (transformOpts.ignore === undefined && transformOpts.only === undefined) {
    transformOpts.only = [
      // Only compile things inside the current working directory.
      new RegExp("^" + escapeRegExp(cwd), "i")
    ];
    transformOpts.ignore = [
      // Ignore any node_modules inside the current working directory.
      new RegExp(
        "^" +
          escapeRegExp(cwd) +
          "(?:" +
          path.sep +
          ".*)?" +
          escapeRegExp(path.sep + "node_modules" + path.sep),
        "i"
      )
    ];
  }
}

// exports = module.exports = function(...args: InputOptions[]) {
//     return register(...args);
// };
// exports.__esModule = true;

// const node = require("./node");
// const register = node.default;

// Object.assign(exports, node);