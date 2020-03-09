"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const cloneDeep_1 = __importDefault(require("lodash/cloneDeep"));
const source_map_support_1 = __importDefault(require("source-map-support"));
// import * as registerCache from "./cache";
const escapeRegExp_1 = __importDefault(require("lodash/escapeRegExp"));
const babel = __importStar(require("@babel/core"));
const core_1 = require("@babel/core");
const pirates_1 = require("pirates");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const maps = {};
let transformOpts = {};
let piratesRevert = null;
function installSourceMapSupport() {
    source_map_support_1.default.install({
        handleUncaughtExceptions: false,
        environment: "node",
        retrieveSourceMap(source) {
            console.log("SUPERBE");
            const map = maps && maps[source];
            if (map) {
                return {
                    url: null,
                    map: map,
                };
            }
            else {
                return null;
            }
        },
    });
}
let cache = {};
;
function mtime(filename) {
    return +fs_1.default.statSync(filename).mtime;
}
function compile(code, filename) {
    // merge in base options and resolve all the plugins and presets relative to this file
    const opts = new babel.OptionManager().init(Object.assign(Object.assign({ sourceRoot: path_1.default.dirname(filename) }, cloneDeep_1.default(transformOpts)), { filename }));
    // Bail out ASAP if the file has been ignored.
    if (opts === null)
        return code;
    let cacheKey = `${JSON.stringify(opts)}:${babel.version}`;
    const env = babel.getEnv(false);
    if (env)
        cacheKey += `:${env}`;
    let cached = cache && cache[cacheKey];
    if (!cached || cached.mtime !== mtime(filename)) {
        cached = babel.transform(code, Object.assign(Object.assign({}, opts), { sourceMaps: opts.sourceMaps === undefined ? "both" : opts.sourceMaps, ast: false }));
        if (cache) {
            cache[cacheKey] = cached;
            cached.mtime = mtime(filename);
        }
    }
    console.log(JSON.stringify(cached.code));
    // delete cached.map;
    if (cached.map) {
        if (Object.keys(maps).length === 0) {
            installSourceMapSupport();
        }
        console.log(JSON.stringify(cached.map));
        maps[filename] = cached.map;
    }
    return cached.code;
}
let compiling = false;
function compileHook(code, filename) {
    if (compiling)
        return code;
    try {
        compiling = true;
        return compile(code, filename);
    }
    finally {
        compiling = false;
    }
}
function hookExtensions(exts) {
    if (piratesRevert)
        piratesRevert();
    piratesRevert = pirates_1.addHook(compileHook, { exts, ignoreNodeModules: false });
}
function revert() {
    if (piratesRevert)
        piratesRevert();
}
exports.revert = revert;
register();
function register(opts = {}) {
    opts = { extensions: ['.ts', '.tsx', '.js', '.jsx'] }
    // Clone to avoid mutating the arguments object with the 'delete's below.
    opts = Object.assign({}, opts);
    hookExtensions(opts.extensions || core_1.DEFAULT_EXTENSIONS);
    // if (opts.cache === false && cache) {
    //   registerCache.clear();
    //   cache = null;
    // } else if (opts.cache !== false && !cache) {
    //   registerCache.load();
    //   cache = registerCache.get();
    // }
    delete opts.extensions;
    // delete opts.cache;
    transformOpts = Object.assign(Object.assign({}, opts), { caller: Object.assign({ name: "@babel/register" }, (opts.caller || {})) });
    let { cwd = "." } = transformOpts;
    // Ensure that the working directory is resolved up front so that
    // things don't break if it changes later.
    cwd = transformOpts.cwd = path_1.default.resolve(cwd);
    if (transformOpts.ignore === undefined && transformOpts.only === undefined) {
        transformOpts.only = [
            // Only compile things inside the current working directory.
            new RegExp("^" + escapeRegExp_1.default(cwd), "i"),
        ];
        transformOpts.ignore = [
            // Ignore any node_modules inside the current working directory.
            new RegExp("^" +
                escapeRegExp_1.default(cwd) +
                "(?:" +
                path_1.default.sep +
                ".*)?" +
                escapeRegExp_1.default(path_1.default.sep + "node_modules" + path_1.default.sep), "i"),
        ];
    }
}
exports.default = register;
