/** 
 * Copyright (C) 2020 deroad
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

(function() {

    /** available analyzers for each arch */
    const analyzers = {
        'arm': require('js/libcore2/frontend/arch/arm/analyzer'),
        'x86': require('js/libcore2/frontend/arch/x86/analyzer')
    };

    /** Analyzer is just a "proxy" for the arch dependent implementation */

    /** @constructor */
    function Analyzer(iIj, arch) {
        var analyzer = analyzers[iIj.arch];
    	this.context = new analyzer(arch);
    }

    Analyzer.prototype.transform_step = function(container) {
        return this.context.transform_step(container);
    };

    Analyzer.prototype.transform_done = function(func) {
        return this.context.transform_done(func);
    };

    Analyzer.prototype.ssa_step_regs = function(func, ssa_ctx) {
        return this.context.ssa_step_regs(func, ssa_ctx);
    };

    Analyzer.prototype.ssa_step_vars = function(func, ssa_ctx) {
        return this.context.ssa_step_vars(func, ssa_ctx);
    };

    Analyzer.prototype.ssa_step_derefs = function(func, ssa_ctx) {
        return this.context.ssa_step_derefs(func, ssa_ctx);
    };

    Analyzer.prototype.ssa_done = function(func, ssa) {
        return this.context.ssa_done(func, ssa);
    };

    return Analyzer;
});