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
const lodash_clonedeep_1 = __importDefault(require("lodash.clonedeep"));
const source_map_support_1 = __importDefault(require("source-map-support"));
const convert_source_map_1 = __importDefault(require("convert-source-map"));
const lodash_escaperegexp_1 = __importDefault(require("lodash.escaperegexp"));
const swc = __importStar(require("@swc/core"));
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
            const map = maps && maps[source];
            if (map) {
                return {
                    url: null,
                    map: map
                };
            }
            else {
                return null;
            }
        }
    });
}
function mtime(filename) {
    return +fs_1.default.statSync(filename).mtime;
}
function compile(code, filename) {
    // merge in base options and resolve all the plugins and presets relative to this file
    const opts = Object.assign(Object.assign({ sourceRoot: path_1.default.dirname(filename) }, lodash_clonedeep_1.default(transformOpts)), { filename });
    if (typeof code !== "string") {
        code = code.toString();
    }
    delete opts.only;
    delete opts.ignore;
    const output = swc.transformSync(code, Object.assign(Object.assign({}, opts), { sourceMaps: opts.sourceMaps === undefined ? "both" : opts.sourceMaps }));
    if (output.map) {
        if (Object.keys(maps).length === 0) {
            installSourceMapSupport();
        }
        let map = JSON.parse(output.map);
        //map = {"version":3,"sources":["index.ts"],"names":["console","log","add","num1","num2","res","endRes"],"mappings":";;;;;;AAAA;AACA;AAEAA,OAAO,CAACC,GAAR,CAAY,OAAZ;;AACO,SAASC,GAAT,CAAaC,IAAb,EAA2BC,IAA3B,EAAwC;AAC3C,SAAOD,IAAI,GAAGC,IAAd;AACH;;AACD,IAAMC,GAAG,GAAGH,GAAG,CAAC,CAAD,EAAI,CAAJ,CAAf;AAEA,IAAMI,MAAM,GAAGD,GAAG,GAAGA,GAArB;AACAL,OAAO,CAACC,GAAR,CAAYK,MAAZ","sourcesContent":["// import { add } from './add';\r\n// export {add} from './add'\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\nconsole.log(\"start\")\r\nexport function add(num1: number, num2: number){\r\n    return num1 + num2;\r\n}\r\nconst res = add(3, 4);\r\n\r\nconst endRes = res * res;\r\nconsole.log(endRes)\r\n"]};
        map.sourcesContent = [map.sources];
        map.sources = ["index.ts"];
        output.map = JSON.stringify(map);
        maps[filename] = output.map;
        output.code += "\n" + convert_source_map_1.default.fromJSON(output.map).toComment();
        console.log(output.map)
    }
    console.log(output.code)
    return output.code;
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
    piratesRevert = pirates_1.addHook(compileHook, { exts: exts, ignoreNodeModules: true });
}
function revert() {
    if (piratesRevert)
        piratesRevert();
}
exports.revert = revert;
register();
function register(opts = {}) {
    // Clone to avoid mutating the arguments object with the 'delete's below.
    opts = Object.assign({}, opts);
    hookExtensions(opts.extensions || swc.DEFAULT_EXTENSIONS);
    delete opts.extensions;
    transformOpts = Object.assign(Object.assign({}, opts), { caller: Object.assign({ name: "@swc/register" }, (opts.caller || {})) });
    let { cwd = "." } = transformOpts;
    // Ensure that the working directory is resolved up front so that
    // things don't break if it changes later.
    cwd = transformOpts.cwd = path_1.default.resolve(cwd);
    if (transformOpts.ignore === undefined && transformOpts.only === undefined) {
        transformOpts.only = [
            // Only compile things inside the current working directory.
            new RegExp("^" + lodash_escaperegexp_1.default(cwd), "i")
        ];
        transformOpts.ignore = [
            // Ignore any node_modules inside the current working directory.
            new RegExp("^" +
                lodash_escaperegexp_1.default(cwd) +
                "(?:" +
                path_1.default.sep +
                ".*)?" +
                lodash_escaperegexp_1.default(path_1.default.sep + "node_modules" + path_1.default.sep), "i")
        ];
    }
}
exports.default = register;
// exports = module.exports = function(...args: InputOptions[]) {
//     return register(...args);
// };
// exports.__esModule = true;
// const node = require("./node");
// const register = node.default;
// Object.assign(exports, node);
