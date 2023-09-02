// SPDX-FileCopyrightText: 2017-2023 Giovanni Dante Grazioli <deroad@libero.it>
// SPDX-License-Identifier: BSD-3-Clause

var _default_cmp = function(a, b) {
    return a - b;
};

export default {
    indexOf: function(value, array, compare) {
        if (!compare) {
            compare = _default_cmp;
        }
        var min = 0;
        var max = array.length - 1;
        var index;
        while (min <= max) {
            index = (min + max) >> 1;
            var cmp = compare(value, array[index]);
            if (cmp === 0) {
                return index;
            } else {
                if (cmp < 0) {
                    min = index + 1;
                } else {
                    max = index - 1;
                }
            }
        }
        return -1;
    },
    search: function(value, array, compare) {
        var pos = this.indexOf(value, array, compare);
        return pos >= 0 ? array[pos] : null;
    }
};