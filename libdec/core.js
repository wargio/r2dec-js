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
    const Base = require('libdec/core/base');
    const Block = require('libdec/core/block');
    const Scope = require('libdec/core/scope');
    const Extra = require('libdec/core/extra');
    const Strings = require('libdec/core/strings');
    const Symbols = require('libdec/core/symbols');
    const Classes = require('libdec/core/classes');
    const Functions = require('libdec/core/functions');
    const Instruction = require('libdec/core/instruction');
    const ControlFlow = require('libdec/core/controlflow');
    const XRefs = require('libdec/core/xrefs');

    /**
     * Fixes for known routine names that are standard (like main)
     * @param  {String} routine_name Routine name
     * @param  {String} return_type  Return type
     * @return {String}              New return type
     */
    var _hardcoded_fixes = function(routine_name, return_type) {
        if (Extra.replace.call(routine_name) == "main") {
            return 'int32_t';
        }
        return return_type || 'void';
    };

    /**
     * Is the function that is called after the opcode analisys.
     * Essentially analyze the flows and allows the call of
     * the `postanalisys` function that has to be set in the architecture.
     * @param  {Object} session      - Current session object.
     * @param  {Object} arch         - Current architecture object
     * @param  {Object} arch_context - Current architecture context object.
     */
    var _post_analysis = function(session, arch, arch_context) {
        ControlFlow(session);
        if (arch.postanalisys) {
            arch.postanalisys(session.instructions, arch_context);
        }
        var routine_name = arch.routine_name ? arch.routine_name(session.routine_name) : Extra.replace.call(session.routine_name);
        if (session.instructions.length < 1) {
            return;
        }
        var routine = new Scope.routine(session.instructions[0].location, {
            returns: _hardcoded_fixes(session.routine_name, arch.returns(arch_context)),
            name: session.routine_name,
            routine_name: routine_name,
            args: arch.arguments(arch_context) || [],
            locals: arch.localvars(arch_context) || [],
            globals: arch.globalvars(arch_context) || []
        });
        session.routine = routine;
    };

    /**
     * Is the function that is called before the opcode analisys.
     * Calls `preanalisys` function that has to be set in the architecture
     * and copies the instruction into the first block and updates the bounds of this.
     * @param  {Object} session      - Current session object.
     * @param  {Object} arch         - Current architecture object
     * @param  {Object} arch_context - Current architecture context object.
     */
    var _pre_analysis = function(session, arch, arch_context) {
        if (arch.preanalisys) {
            arch.preanalisys(session.instructions, arch_context);
        }
        session.blocks[0].instructions = session.instructions.slice();
        session.blocks[0].update();
    };

    /**
     * Most important of the analisys block: it analize the architecture opcodes. 
     * @param  {Object} session      - Current session object.
     * @param  {Object} arch         - Current architecture object
     * @param  {Object} arch_context - Current architecture context object.
     */
    var _decompile = function(session, arch, arch_context) {
        var instructions = session.blocks[0].instructions;
        for (var i = 0; i < instructions.length; i++) {
            var instr = instructions[i];
            if (!instr.parsed.mnem || instr.parsed.mnem.length < 1) {
                Global.warning("invalid mnem. stopping instruction analysis.");
                break;
            }
            var fcn = arch.instructions[instr.parsed.mnem];
            // Global.context.printLine(instr.assembly)
            instr.code = fcn ? fcn(instr, arch_context, instructions) : new Base.unknown(instr.assembly);
        }
    };

    /**
     * Prints the current session into the screen.
     * @param  {Object} session - Current session object.
     */
    var _print = function(session) {
        if (!session.routine) {
            Global.context.printLog('Error: no "good" data given (all invalid opcodes).', true);
            return;
        }
        if (Global.evars.extra.ascomment) {
            session.ascomment();
            Global.context.printLog('[r2dec] comments applied for "' + session.routine_name + '".');
            return;
        } else if (Global.evars.extra.ascodeline) {
            session.ascodeline();
            Global.context.printLog('[r2dec] new code lines applied for "' + session.routine_name + '".');
            return;
        }
        if (!Global.evars.extra.allfunctions) {
            var t = Global.printer.theme;
            var asm_header = Global.evars.honor.offsets ? '' : '; assembly';
            var details = '/* ' + Global.evars.extra.file + ' @ 0x' + Global.evars.extra.offset.toString(16) + ' */';
            
            if (Global.evars.extra.annotation) {
                Global.context.addAnnotation(Anno.comment('/* r2dec pseudo code output */\n'));
                Global.context.addAnnotation(Anno.comment(details + '\n'));
            } else {
                Global.context.printLine(Global.context.identfy(asm_header.length, t.comment(asm_header)) + t.comment('/* r2dec pseudo code output */'));
                Global.context.printLine(Global.context.identfy() + t.comment(details));
            }
            if (['java', 'dalvik'].indexOf(Global.evars.arch) < 0) {
                Global.context.printMacros();
                Global.context.printDependencies();
            }
        }
        session.print();
        var last_instr = session.instructions[session.instructions.length - 1];
        while (Global.context.ident.length > 0) {
            Global.context.identOut();
            var value = Global.context.identfy() + '}';
            if (Global.evars.extra.annotation) {
                Global.context.addAnnotation(value + '\n', last_instr ? last_instr.location : null);
            } else {
                Global.context.printLine(value);
            }
        }
    };

    /**
     * Defines the structure that will be used as session for analisys steps.
     * @param  {Object} data - Data to be analized.
     * @param  {Object} arch - Current architecture object
     */
    var _session = function(data, arch) {
        this.blocks = [new Block()];
        var instructions = [];
        var symbols = new Symbols(data.xrefs.symbols);
        var strings = new Strings(data.xrefs.strings);
        var classes = new Classes(data.xrefs.classes);
        var functions = new Functions(data.xrefs.functions);
        var max_length = 0;
        var max_address = 8;
        Global.xrefs = new XRefs(strings, symbols, classes);
        for (var i = 0; i < data.graph[0].blocks.length; i++) {
            var block = data.graph[0].blocks[i];
            // This is hacky but it is required by wasm..
            if (data.arch == 'wasm') {
                var last = block.ops[block.ops.length - 1];
                if (!last.jump) {
                    last.jump = block.jump;
                }
            }
            instructions = instructions.concat(block.ops.filter(function(b) {
                return b.opcode != null;
            }).map(function(b) {
                if (max_length < b.opcode.length) {
                    max_length = b.opcode.length;
                }
                var ins = new Instruction(b, arch, i);
                if (max_address < ins.location.toString(16)) {
                    max_address = ins.location.toString(16).length;
                }
                ins.symbol = symbols.search(ins.pointer || ins.jump);
                ins.string = strings.search(ins.pointer);
                ins.klass  = classes.search(ins.pointer);
                ins.callee = functions.search(ins.jump);
                return ins;
            }));
        }
        this.routine_name = data.graph[0].name;
        if (max_length < this.routine_name.length) {
            max_length = this.routine_name.length;
        }
        Global.context.identAsmSet(max_address + (max_length < this.routine_name.length ? this.routine_name.length : max_length));
        this.instructions = instructions.filter(function(op, p, ops) {
            for (var i = p - 1; i >= 0; i--) {
                if (ops[i].location.eq(op.location)) {
                    return false;
                }
            }
            return true;
        });
        this.ascomment = function() {
            for (var i = 0; i < this.blocks.length; i++) {
                this.blocks[i].ascomment();
            }
        };
        this.ascodeline = function() {
            for (var i = 0; i < this.blocks.length; i++) {
                this.blocks[i].ascodeline();
            }
        };
        this.print = function() {
            this.routine.print();
            for (var i = 0; i < this.blocks.length; i++) {
                this.blocks[i].print();
            }
        };
    };

    return {
        decompile: _decompile,
        session: _session,
        analysis: {
            pre: _pre_analysis,
            post: _post_analysis
        },
        print: _print,
    };
});