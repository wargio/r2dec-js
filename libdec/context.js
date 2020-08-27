/* 
 * Copyright (C) 2018 deroad
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
    const Anno = require('libdec/annotation');
    return function() {
        this.lines = [];
        this.errors = [];
        this.log = [];

        /**
         * Adds an annotation line of decompiled code.
         * @param Annotation|String annotation The annotated code
         * @param Long              offset     The annotated code offset
         */
        this.addAnnotation = function(annotation, offset) {
            if (!annotation && ["undefined", "object"].indexOf(typeof(annotation)) >= 0) {
                throw new Error("undefined object in annotation.");
            }
            if (!annotation._annotation_ && typeof(annotation) !== 'string') {
                throw new Error("not an Annotation object.");
            }
            if (typeof(annotation) === 'string') {
                annotation = Anno.offset(annotation, offset);
            }
            this.lines.push(annotation);
        };

        /**
         * Adds several annotations of decompiled code.
         * @param Array annotations The annotated code
         */
        this.addAnnotations = function(annotations) {
            if (!annotations && ["undefined", "object"].indexOf(typeof(annotations)) >= 0) {
                throw new Error("undefined object in annotation.");
            }
            if (annotations.filter(function(x) { return !x._annotation_; }).length > 0) {
                throw new Error("found some non Annotation objects.");
            }
            if (Array.isArray(annotations)) {
                Array.prototype.push.apply(this.lines, annotations);
            }
        };

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
            if (Global.evars.extra.json) {
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
        this.printMacros = function() {
            if (!Global.evars.honor.blocks) {
                var t = Global.printer.theme;
                for (var i = 0; i < this.macros.length; i++) {
                    if (Global.evars.extra.annotation) {
                        this.addAnnotation(Anno.comment(this.macros[i]));
                        this.addAnnotation('\n');
                    } else {
                        this.printLine(this.identfy() + t.macro(this.macros[i]));
                    }
                }
            }
            if (Global.evars.extra.annotation) {
                this.addAnnotation('\n');
            } else {
                this.printLine(this.identfy() + ' ');
            }
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
        this.printDependencies = function() {
            if (Global.evars.honor.blocks) {
                return;
            }

            this.dependencies.forEach(function(x) {
                x.print();
            });
            if (this.dependencies.length > 0) {
                if (Global.evars.extra.annotation) {
                    this.addAnnotation(Anno.offset('\n'));
                } else {
                    this.printLine(this.identfy() + ' ');
                }
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
            if (Global.evars.honor.assembly && !Global.evars.honor.blocks) {
                string_to_print = string_to_print || '';
                size_no_colors = size_no_colors || 0;
                return '    ' + string_to_print + this.identAsm.substring(size_no_colors, this.identAsm.length) + ' | ' + ident;
            } else if (Global.evars.honor.offsets && !Global.evars.honor.blocks) {
                string_to_print = string_to_print || '';
                size_no_colors = size_no_colors || 0;
                return '    ' + string_to_print + this.identAsm.substring(size_no_colors, 14) + ' | ' + ident;
            }
            return ident;
        };

    };
});