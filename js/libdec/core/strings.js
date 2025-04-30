// SPDX-FileCopyrightText: 2017-2023 Giovanni Dante Grazioli <deroad@libero.it>
// SPDX-License-Identifier: BSD-3-Clause

import r2pipe from "../r2pipe.js";
import Utils from "./utils.js";

var _compare = function (a, b) {
  if (a.eq(b.location)) {
    return 0;
  } else if (a.lt(b.location)) {
    return 1;
  }
  return -1;
};

var _str_compare_location = function (a, b) {
  return a.location.lt(b.location) ? -1 : (a.location.eq(b.location) ? 0 : 1);
};

var _str_compare_size = function (a, b) {
  return a.value < b.value ? -1 : (a.value == b.value ? 0 : 1);
};

var _sanitize = function (x) {
  return x.paddr || x.vaddr || x.offset;
};

var _flag_filter = function (x) {
  var ch = x.charAt(0);
  if (
    (ch >= "a".charAt(0) && ch <= "z".charAt(0)) ||
    (ch >= "A".charAt(0) && ch <= "Z".charAt(0)) ||
    (ch >= "0".charAt(0) && ch <= "9".charAt(0))
  ) {
    return x;
  }
  switch (ch) {
    case "\\".charAt(0):
    case ":".charAt(0):
    case ".".charAt(0):
    case "_".charAt(0):
      return x;
  }
  return "_";
};

/*
 * Expects the Csj json as input.
 */
export default function (Csj, sort_by_size) {
  this.data = Csj.filter(_sanitize).map(function (x) {
    return {
      location: Global().evars.honor.paddr ? x.paddr : x.vaddr || x.offset,
      value: atob(x.string || x.name).replace(/\\\\/g, "\\"),
    };
  }).sort(sort_by_size ? _str_compare_size : _str_compare_location);
  this.search = function (address) {
    if (address) {
      if (!Global().evars.extra.slow) {
        var x = r2pipe.string("Cs.q @ 0x" + address.toString(16));
        if (x) {
          x = x.substr(1);
          return x.substr(0, x.length - 1);
        }
      }
      var r = Utils.search(address, this.data, _compare);
      return r ? r.value : null;
    }
    return null;
  };
  this.search_by_flag = function (flag) {
    if (flag && flag.startsWith("str.")) {
      if (!Global().evars.extra.slow) {
        var address = r2pipe.string("s @ " + flag);
        var x = r2pipe.string("Cs.q @ " + address.toString(16));
        if (x) {
          x = x.substr(1);
          return x.substr(0, x.length - 1);
        }
      }
      for (var i = 0; i < this.data.length; i++) {
        var elem = "str." +
          this.data[i].value.split("").map(_flag_filter).join("").trim();
        elem = elem.replace(/\\[abnrtv]/g, "_").replace(/\\/g, "_");
        elem = elem.replace(/^str._+/, "str.");
        elem = elem.replace(/_+$/, "");
        if (elem == flag) {
          return this.data[i].value;
        }
      }
    }
    return null;
  };
}
