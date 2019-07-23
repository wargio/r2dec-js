/* 
 * Copyright (C) 2019 deroad
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

(function() { // lgtm [js/useless-expression]
    var JSON64 = require('libdec/json64');
    var Long = require('libdec/long');

    function r2custom(value, regex, function_fix) {
        var x = r2cmd(value);
        if (regex) {
            x = x.replace(regex, '');
        }
        return function_fix ? function_fix(x.trim()) : x.trim();
    }

    function r2str(value, multiline) {
        var x = r2cmd(value);
        if (multiline) {
            x = x.replace(/\n/g, '');
        }
        return x.trim();
    }

    function r2json(m, def) {
        var x = r2str(m, true);
        try {
            return x.length > 0 ? JSON.parse(x) : def;
        } catch(e){}
        return def;
    }

    function r2json64(m, def) {
        var x = r2str(m, true);
        try {
            return x.length > 0 ? JSON64.parse(x) : def;
        } catch(e){}
        return def;
    }

    function r2int(value, def) {
        var x = r2str(value);
        if (x != '') {
            try {
                return parseInt(x);
            } catch (e) {}
        }
        return def || 0;
    }

    function r2long(value, def) {
        var x = r2str(value);
        if (x != '') {
            try {
                return Long.fromString(x, true, x.startsWith('0x') ? 16 : 10);
            } catch (e) {}
        }
        return def || Long.UZERO;
    }

    function r2bool(value) {
        var x = r2str(value);
        return x == 'true' || x == '1';
    }

    return {
        custom: r2custom,
        string: r2str,
        json64: r2json64,
        json: r2json,
        int: r2int,
        long: r2long,
        bool: r2bool,
    };
});