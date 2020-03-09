import * as swc from "@swc/core";


let output = swc
  .transformSync("let x = 3;", {
    sourceMaps: "inline",

    // All options below can be configured via .swcrc
    jsc: {
      parser: {
        syntax: "ecmascript"
      },
      transform: {}
    }
  });

  
console.log(output.code);
console.log(output.map);
