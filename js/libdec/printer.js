// SPDX-FileCopyrightText: 2018-2023 Giovanni Dante Grazioli <deroad@libero.it>
// SPDX-License-Identifier: BSD-3-Clause

import JSONex from "./JSONex.js";
import Long from "./long.js";
import Anno from "./annotation.js";
import ColorsAnsi from "./colors/ansi.js";
import ColorsInvalid from "./colors/invalid.js";

function initializeColors() {
  const config = {};
  const colors = radare2 ? radare2.command("ec*") : "";
  colors.split("\n").forEach(function (line) {
    const tok = line.split(" ");
    config[tok[1]] = tok[2];
  });
  return {
    "callname": config["call"] || "gray",
    "integers": config["num"] || "cyan",
    "comment": config["comment"] || "red",
    "labels": config["flag"] || "green",
    "types": config["func_var_type"] || "green",
    "macro": config["cjmp"] || "yellow",
    "flow": config["flow"] || "magenta",
    "text": config["usrcmt"] || "yellow",
  };
}
//const _autoregex = /(\bif\b|\belse\b|\bwhile\b|\bfor\b|\bdo\b|\breturn\b|[ui]+nt[123468]+\_t|\bvoid\b|\bconst\b|\bsizeof\b|\bfloat\b|\bdouble\b|0x[0-9A-Fa-f]+|\b\d+\b)/g

/**
 * Contains the regex used to colorize a given string.
 * @type {Object}
 */
const _autotheme = {
  controlflow: /\bif\b|\belse\b|\bwhile\b|\bfor\b|\bdo\b|\breturn\b|\bthrow\b/g,
  definebits:
    /[ui]+nt[123468]+_t|\bvoid\b|\bconst\b|\bsizeof\b|\bfloat\b|\bdouble\b|\bchar\b|\bwchar_t\b|\bextern\b|\bstruct\b|\bsize_t\b|\btime_t\b|\bboolean\b/g,
  numbers: /0x[0-9a-fA-F]+|\b(?![;[])\d+(?![;m])\b/g,
  string: /("[^"]+")/,
};

const defaulttheme = initializeColors();

/**
 * Color types (ansi, nocolor)
 * @type {Object}
 */
const Colors = {
  ansi: ColorsAnsi,
  text: ColorsInvalid,
};

var _theme_colors = Colors.text.make(defaulttheme);

/**
 * Applies colors to the string given a certain regex
 * @param  {String} input - Input string
 * @param  {String} type  - Color name (ansi, text)
 * @param  {String} regex - Regex to apply
 * @return {String}       - Result string
 */
var _apply_regex = function (input, type, regex) {
  var x = input.split(regex);
  var p = input.match(regex);
  var s = "";
  if (!p) {
    return s;
  }
  var i = 0;
  for (i = 0; i < p.length; i++) {
    if (p[i].length > 0) {
      s += x[i] + _theme_colors[type](p[i]);
    } else {
      s += x[i] + p[i];
    }
  }
  for (; i < x.length; i++) {
    s += x[i];
  }
  return s;
};

/**
 * Colorize the input string via ansi converters
 * @param  {String} input - Input string
 * @return {String}       - Result string
 */
var _colorize_text = function (input) {
  if (!input || input.length < 1) {
    return "";
  }
  if (!Global().evars.honor.color) {
    return input;
  }
  /* control flow (if, else, while, do, etc..) */
  var x = input.split(_autotheme.controlflow);
  if (x.length > 1) {
    input = _apply_regex(input, "flow", _autotheme.controlflow);
  }
  /* numbers */
  x = input.split(_autotheme.numbers);
  if (x.length == 1 && x == "") {
    input = this.theme.integers(input);
  } else if (x.length > 1) {
    input = _apply_regex(input, "integers", _autotheme.numbers);
  }
  /* uint32_t, etc.. */
  x = input.split(_autotheme.definebits);
  if (x.length == 1 && x == "") {
    input = this.theme.types(input);
  } else if (input.split(_autotheme.definebits).length > 1) {
    input = _apply_regex(input, "types", _autotheme.definebits);
  }
  return input;
};

/**
 * Applies all the colors options (theme/colors).
 */
var _get_theme = function (evars) {
  if (evars && evars.honor && evars.honor.color) {
    return Colors.ansi.make(defaulttheme);
  }
  return Colors.text.make(defaulttheme);
};

/**
 * Prints the final r2dec output
 * @param useJSON - boolean whether to print as json
 */
var _flush_output = function (lines, errors, log) {
  if (Global().evars.extra.annotation && lines) {
    var actx = Anno.context();
    var res = {
      code: "",
      annotations: [],
    };
    lines.forEach(function (x) {
      var parsed = Anno.parse(res.code.length, x, actx);
      res.annotations = res.annotations.concat(parsed);
      res.code += x.str + "\n";
    });
    console.log(JSONex.stringify(res));
  } else if (Global().evars.extra.json) {
    var jdata = {};
    if (lines && lines.length > 0) {
      jdata.lines = lines;
    }
    if (errors && errors.length > 0) {
      jdata.errors = errors;
    }
    if (log && log.length > 0) {
      jdata.log = log;
    }
    console.log(JSONex.stringify(jdata));
  } else {
    var prefix = Global().evars.extra.allfunctions ? "// " : "";
    if (lines && lines.length > 0) {
      for (var i = 0; i < lines.length; i++) {
        if (
          Global().evars.extra.highlights &&
          Global().evars.extra.offset.eq(lines[i].offset || Long.ZERO)
        ) {
          console.log("\u001b[7m" + lines[i].str + "\u001b[49m\u001b[0m");
        } else {
          console.log(lines[i].str);
        }
      }
    }
    if (errors && errors.length > 0) {
      console.log(prefix + errors.join("\n").replace(/\n/g, "\n" + prefix));
    }
    if (log && log.length > 0) {
      console.log(prefix + log.join("\n").replace(/\n/g, "\n" + prefix));
    }
  }
};

/**
 * Printer Object
 * @return {Function} - Printer object (to be called via `new Printer()`)
 */
export default function () {
  this.theme = _get_theme(Global().evars);
  this.auto = _colorize_text;
  this.flushOutput = _flush_output;
}
