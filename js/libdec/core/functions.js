// SPDX-FileCopyrightText: 2017-2023 Giovanni Dante Grazioli <deroad@libero.it>
// SPDX-License-Identifier: BSD-3-Clause

import r2pipe from '../r2pipe.js';
import Utils from './utils.js';

var _compare_search = function(a, b) {
    if (a.eq(b.offset)) {
        return 0;
    } else if (a.lt(b.offset)) {
        return 1;
    }
    return -1;
};

var _compare_offsets = function(a, b) {
    return a.offset.lt(b.offset) ? -1 : (a.offset.eq(b.offset) ? 0 : 1);
};

var _compare_name = function(a, b) {
    return a.name < b.name ? -1 : (a.name == b.name ? 0 : 1);
};

var create_fcn_data = function(x) {
    if (!x) {
        return null;
    }
    return {
        offset: x.offset?? x.addr,
        name: x.name,
        calltype: x.calltype?? x.callconv,
        nargs: x.nargs
    };
};

/*
 * Expects the aflj json as input.
 */
export default function(aflj, sort_by_name) {
    this.data = aflj.sort(sort_by_name ? _compare_name : _compare_offsets).map(function(x) {
        return create_fcn_data(x);
    });

    this.search = function(offset) {
        if (!Global().evars.extra.slow && offset) {
            var x = r2pipe.json('afij @ 0x' + offset.toString(16), [])[0];
            return create_fcn_data(x);
        }
        return offset ? Utils.search(offset, this.data, _compare_search) : null;
    };
}
