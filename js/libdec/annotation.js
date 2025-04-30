// SPDX-FileCopyrightText: 2020-2023 Giovanni Dante Grazioli <deroad@libero.it>
// SPDX-License-Identifier: BSD-3-Clause

const _re = {
  controlflow: /\bif\b|\belse\b|\bwhile\b|\bfor\b|\bdo\b|\breturn\b|\bthrow\b/g,
  definebits:
    /[ui]+nt[123468]+_t|\bvoid\b|\bconst\b|\bsizeof\b|\bfloat\b|\bdouble\b|\bchar\b|\bwchar_t\b|\bextern\b|\bstruct\b|\bsize_t\b|\btime_t\b|\bboolean\b/g,
  numbers: /0x[0-9a-fA-F]+|\b(?![;[])\d+(?![;m])\b/g,
  string: /"[^"]+"/,
};

/**
 * Applies colors to the string given a certain regex
 * @param  {String} regex  - Regex to apply
 * @param  {String} input  - Array of values
 * @param  {String} type   - Annotation type
 * @param  {Number} offset - Annotation offset
 * @return {Object}        - Result
 */
function _auto_annotation(regex, input, type, offset) {
  var x = input.split(regex);
  var p = input.match(regex);
  var s = [];
  if (!p) {
    return input;
  }
  var i = 0;
  for (i = 0; i < p.length; i++) {
    s.push(x[i]);
    if (p[i].length > 0) {
      s.push(new Annotation(p[i], offset, type));
    }
  }
  for (; i < x.length; i++) {
    s.push(x[i]);
  }
  return s;
}

/**
 * Annotation object
 * @param string value    Value of the annotation
 * @param number location Location of the annotation
 * @param string type     Type of the annotation
 */
function Annotation(value, location, type) {
  this.value = value || "";
  this.location = location || Global().evars.extra.offset;
  this.type = this.value.length > 0 ? type : "offset";
  this._annotation_ = true;
  this.define = function (current) {
    var d = {
      start: current,
      end: current + this.value.length,
      type: this.type,
    };
    if (
      ["function_name", "function_parameter", "local_variable"].indexOf(
        this.type,
      ) >= 0
    ) {
      d.name = this.value;
    }
    if (["function_name", "offset"].indexOf(this.type) >= 0) {
      d.offset = this.location.toString();
    }
    return d;
  };
  this.syntax = function (current) {
    return {
      start: current,
      end: current + this.value.length,
      type: "syntax_highlight",
      syntax_highlight: this.type,
    };
  };
}

function _rebuild(array) {
  var newarray = [];
  for (var i = 0; i < array.length; i++) {
    if (Array.isArray(array[i])) {
      newarray = newarray.concat(array[i]);
    } else {
      newarray.push(array[i]);
    }
  }
  return newarray;
}

export default {
  /* do some magic and autoassigne the values. */
  auto: function (value, location) {
    if (typeof value !== "string") {
      if (value && value.toAnnotation) {
        value = value.toAnnotation(location);
      } else if (value.__isLong__ || typeof value === "number") {
        value = new Annotation(
          "0x" + value.toString(16),
          location,
          "constant_variable",
        );
      }
      return Array.isArray(value) ? _rebuild(value) : [value];
    }
    var i;
    var a = _auto_annotation(_re.string, value, "offset", location);
    for (i = 0; i < a.length; i++) {
      if (typeof (a[i]) === "string") {
        a[i] = _auto_annotation(_re.controlflow, a[i], "keyword", location);
      }
    }
    a = _rebuild(a);
    for (i = 0; i < a.length; i++) {
      if (typeof (a[i]) === "string") {
        a[i] = _auto_annotation(
          _re.numbers,
          a[i],
          "constant_variable",
          location,
        );
      }
    }
    a = _rebuild(a);
    for (i = 0; i < a.length; i++) {
      if (typeof (a[i]) === "string") {
        a[i] = _auto_annotation(_re.definebits, a[i], "datatype", location);
      }
    }
    a = _rebuild(a);
    for (i = 0; i < a.length; i++) {
      if (typeof (a[i]) === "string") {
        a[i] = new Annotation(a[i], location, "offset");
      }
    }
    return _rebuild(a);
  },
  /* user defined */
  comment: function (value, location) {
    return new Annotation(value, location, "comment");
  },
  constvar: function (value, location) {
    return new Annotation(value, location, "constant_variable");
  },
  datatype: function (value, location) {
    return new Annotation(value, location, "datatype");
  },
  funcname: function (value, location) {
    return new Annotation(value, location, "function_name");
  },
  funcparam: function (value, location) {
    return new Annotation(value, location, "function_parameter");
  },
  keyword: function (value, location) {
    return new Annotation(value, location, "keyword");
  },
  localvar: function (value, location) {
    return new Annotation(value, location, "local_variable");
  },
  offset: function (value, location) {
    return new Annotation(value, location, "offset");
  },
};
