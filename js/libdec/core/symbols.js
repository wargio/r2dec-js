// SPDX-FileCopyrightText: 2018-2023 Giovanni Dante Grazioli <deroad@libero.it>
// SPDX-License-Identifier: BSD-3-Clause

import r2pipe from "../r2pipe.js";
import Utils from "./utils.js";
import Long from "../long.js";

var _compare = function (a, b) {
  if (a.eq(b.location)) {
    return 0;
  } else if (a.lt(b.location)) {
    return 1;
  }
  return -1;
};

var _virtual_compare = function (a, b) {
  return a.vaddr.lt(b.vaddr) ? -1 : (a.vaddr.eq(b.vaddr) ? 0 : 1);
};

var _physical_compare = function (a, b) {
  return a.paddr.lt(b.paddr) ? -1 : (a.paddr.eq(b.paddr) ? 0 : 1);
};

var _sanitize = function (x) {
  return x.paddr || x.vaddr;
};

/*
 * Expects the isj json as input.
 */
export default function (isj) {
  this.data = isj.filter(_sanitize).sort(
    Global().evars.honor.paddr ? _physical_compare : _virtual_compare,
  ).map(function (x) {
    return {
      location: Global().evars.honor.paddr ? x.paddr : x.vaddr,
      value: (x.demname && x.demname.length > 0) ? x.demname : x.name,
    };
  });
  this.search = function (address) {
    const evars = Global().evars;
    if (!address) {
      return null;
    } else if (!Long.isLong(address)) {
      address = Long.from(address, true);
    }
    if (!evars.extra.slow) {
      var def = {
        symbols: {},
      };
      var x = r2pipe.json("is.j @ 0x" + address.toString(16), def);
      if (x.length != 1) {
        return null;
      }
      x = x[0];
      var loc = (evars.honor.paddr ? x.paddr : x.vaddr) || Long.MAX_U64_VALUE;
      return address.eq(loc) && !Long.MAX_U64_VALUE.eq(loc)
        ? ((x.demname && x.demname.length > 0) ? x.demname : x.name)
        : null;
    }
    var r = Utils.search(address, this.data, _compare);
    return r ? r.value : null;
  };
}
