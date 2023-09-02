// SPDX-FileCopyrightText: 2018-2023 Giovanni Dante Grazioli <deroad@libero.it>
// SPDX-License-Identifier: BSD-3-Clause

export default function() {
    this.lines = [];
    this.errors = [];
    this.log = [];

    /**
     * Print a line of decompiled code.
     * @param str - content of the line
     * @param offset - offset of the original instruction (optional)
     */
    this.printLine = function(str, offset) {
        var line = { str: str, offset: offset };
        this.lines.push(line);
    };

    /**
     * Print a line for logging.
     * @param str - content to print
     * @param error - boolean whether this is an error (optional)
     */
    this.printLog = function(str, error) {
        if (Global().evars.extra.json) {
            if(error) {
                this.errors.push(str);
            } else {
                this.log.push(str);
            }
        } else {
            console.log(str);
        }
    };

    /**
     * Internal C macro list.
     * @type {Array}
     */
    this.macros = ['#include <stdint.h>'];

    /**
     * Adds a C macro string to the global list of macros.
     * @param {String} - item to add
     */
    this.addMacro = function(x) {
        if (this.macros.indexOf(x) < 0) {
            this.macros.push(x);
        }
    };

    /**
     * prints all the macros. used internally by core.js
     */
    this.printMacros = function(offset) {
        if (!Global().evars.honor.blocks) {
            var t = Global().printer.theme;
            for (var i = 0; i < this.macros.length; i++) {
                this.printLine(this.identfy() + t.macro(this.macros[i]), offset);
            }
        }
        this.printLine(this.identfy() + ' ', offset);
    };

    /**
     * List of dependencies (mostly generic functions like rotate, etc..)
     * that cannot be described easily from a asm opcode.
     * @type {Array}
     */
    this.dependencies = [];

    /**
     * adds a dependency to the global list.
     * @param {String|Object} - item to add
     */
    this.addDependency = function(x) {
        if (this.dependencies.indexOf(x) < 0) {
            this.dependencies.push(x);
        }
    };

    /**
     * prints all the dependencies. used internally by core.js
     */
    this.printDependencies = function(offset) {
        if (Global().evars.honor.blocks) {
            return;
        }

        this.dependencies.forEach(function(x) {
            x.print(offset);
        });
        if (this.dependencies.length > 0) {
            this.printLine(this.identfy() + ' ', offset);
        }
    };

    /**
     * Assembly identation "constant"
     * @type {String}
     */
    this.identAsm = '';

    /**
     * Sets the max size of the identation line for the `--assembly/r2dec.asm` option.
     * @param  {Number} size - Size to set
     */
    this.identAsmSet = function(size) {
        // size = 0x + addr + space + asm + space
        size += 10;
        while (this.identAsm.length < size) {
            this.identAsm += '    ';
        }
    };

    /**
     * Compare the max size of the identation line with the given one.
     * @param  {Number} size - Size to set
     * @return {Number}
     */
    this.identCompare = function(size) {
        // size = 0x + addr + space + asm + space
        return size - ((this.identAsm.length / 4) - 10);
    };

    /**
     * Scope identation
     * @type {String}
     */
    this.ident = '';

    /**
     * Adds spaces per each scope going in.
     */
    this.identIn = function() {
        this.ident += '    ';
    };

    /**
     * Removes spaces per each scope going out.
     */
    this.identOut = function(force) {
        this.ident = this.ident.substr(4, this.ident.length);
    };

    /**
     * Returns the data to be used for line identation.
     * It's used mostly internally when a line is going to be printed on screen.
     * @param  {Number}  size_no_colors     - Size of the strings without ansi colors
     * @param  {String}  string_to_print    - String to be printed before the pipe
     * @param  {Boolean} disable_identation - Force to not set the scope identation of the line.
     * @return {string}                     - Identation including eventual string to be printed.
     */
    this.identfy = function(size_no_colors, string_to_print, disable_identation) {
        var ident = disable_identation ? '' : this.ident;
        if (Global().evars.honor.assembly && !Global().evars.honor.blocks) {
            string_to_print = string_to_print || '';
            size_no_colors = size_no_colors || 0;
            return '    ' + string_to_print + this.identAsm.substring(size_no_colors, this.identAsm.length) + ' | ' + ident;
        } else if (Global().evars.honor.offsets && !Global().evars.honor.blocks) {
            string_to_print = string_to_print || '';
            size_no_colors = size_no_colors || 0;
            return '    ' + string_to_print + this.identAsm.substring(size_no_colors, 14) + ' | ' + ident;
        }
        return ident;
    };
}
