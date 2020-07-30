/* 
 * Copyright (C) 2020 elicn
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY, without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

(function() {
    /** 
     * coloring tags enumeration
     * @readonly
     * @enum {number}
     */ 
    return Object.freeze({
        RESET   :  0,   // color reset
        WHTSPCE :  1,   // whitespace
        KEYWORD :  2,   // reserved keyword
        CFLOW   :  3,   // control flow keyword
        PAREN   :  4,   // parenthesis
        PUNCT   :  5,   // punctuation
        OPRTOR  :  6,   // operator
        NUMBER  :  7,   // number literal
        STRING  :  8,   // string literal
        FNCALL  :  9,   // function name [func call]
        FNNAME  : 10,   // function name [func prototype]
        VARTYPE : 11,   // data type
        VARNAME : 12,   // variable name
        COMMENT : 13,   // comment
        OFFSET  : 14,   // instruction address
        INVALID : 15    // unknown
    });
});