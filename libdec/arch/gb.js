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

(function() {
    const Base = require('libdec/core/base');
    const Variable = require('libdec/core/variable');
    const Extra = require('libdec/core/extra');

    function global_ptr(type, name, address, context) {
        var value = "extern " + type + "* " + name + " = (" + type + "*) " + address;
        if (context.globals.indexOf(value) < 0) {
            context.globals.push(value);
        }
        return name;
    }

    function global_fcn_ptr(address, context) {
        var name = 'function_' + address.substr(2);
        var value = "typedef (void)(*" + name + ") () = " + address;
        if (context.globals.indexOf(value) < 0) {
            context.globals.push(value);
        }
        return name;
    }

    const conditionals = {
        'NZ': 'NE',
        'Z': 'EQ',
        'C': 'LO',
        'NC': 'NO',
        // negated
        '-NZ': 'EQ',
        '-Z': 'NE',
        '-C': 'NO',
        '-NC': 'LO'
    };

    const memory_map = {
        "0xff00": function(context) {
            return global_ptr("uint8_t", "joypad_rw", "0xff00", context);
        },
        "0xff01": function(context) {
            return global_ptr("uint8_t", "serial_data", "0xff01", context);
        },
        "0xff02": function(context) {
            return global_ptr("uint8_t", "serial_ctrl", "0xff02", context);
        },
        "0xff04": function(context) {
            return global_ptr("uint8_t", "div_register", "0xff04", context);
        },
        "0xff05": function(context) {
            return global_ptr("uint8_t", "tima", "0xff05", context);
        },
        "0xff06": function(context) {
            return global_ptr("uint8_t", "tma", "0xff06", context);
        },
        "0xff07": function(context) {
            return global_ptr("uint8_t", "tac", "0xff07", context);
        },
        "0xff0f": function(context) {
            return global_ptr("uint8_t", "int_flag", "0xff0f", context);
        },
        "0xff10": function(context) {
            return global_ptr("uint8_t", "nr10_chan1", "0xff10", context);
        },
        "0xff11": function(context) {
            return global_ptr("uint8_t", "nr11_chan1", "0xff11", context);
        },
        "0xff12": function(context) {
            return global_ptr("uint8_t", "nr12_chan1", "0xff12", context);
        },
        "0xff13": function(context) {
            return global_ptr("uint8_t", "nr13_chan1", "0xff13", context);
        },
        "0xff14": function(context) {
            return global_ptr("uint8_t", "nr14_chan1", "0xff14", context);
        },
        "0xff16": function(context) {
            return global_ptr("uint8_t", "nr21_chan2", "0xff16", context);
        },
        "0xff17": function(context) {
            return global_ptr("uint8_t", "nr22_chan2", "0xff17", context);
        },
        "0xff18": function(context) {
            return global_ptr("uint8_t", "nr23_chan2", "0xff18", context);
        },
        "0xff19": function(context) {
            return global_ptr("uint8_t", "nr24_chan2", "0xff19", context);
        },
        "0xff1a": function(context) {
            return global_ptr("uint8_t", "nr30_chan3", "0xff1a", context);
        },
        "0xff1b": function(context) {
            return global_ptr("uint8_t", "nr31_chan3", "0xff1b", context);
        },
        "0xff1c": function(context) {
            return global_ptr("uint8_t", "nr32_chan3", "0xff1c", context);
        },
        "0xff1d": function(context) {
            return global_ptr("uint8_t", "nr33_chan3", "0xff1d", context);
        },
        "0xff1e": function(context) {
            return global_ptr("uint8_t", "nr34_chan3", "0xff1e", context);
        },
        "0xff20": function(context) {
            return global_ptr("uint8_t", "nr41_chan4", "0xff20", context);
        },
        "0xff21": function(context) {
            return global_ptr("uint8_t", "nr42_chan4", "0xff21", context);
        },
        "0xff22": function(context) {
            return global_ptr("uint8_t", "nr43_chan4", "0xff22", context);
        },
        "0xff23": function(context) {
            return global_ptr("uint8_t", "nr44_chan4", "0xff23", context);
        },
        "0xff24": function(context) {
            return global_ptr("uint8_t", "nr50_chan_ctrl", "0xff24", context);
        },
        "0xff25": function(context) {
            return global_ptr("uint8_t", "nr51_chan_select", "0xff25", context);
        },
        "0xff26": function(context) {
            return global_ptr("uint8_t", "nr52_chans_mute", "0xff26", context);
        },
        "0xff40": function(context) {
            return global_ptr("uint8_t", "lcd_ctrl", "0xff40", context);
        },
        "0xff41": function(context) {
            return global_ptr("uint8_t", "lcd_status", "0xff41", context);
        },
        "0xff42": function(context) {
            return global_ptr("uint8_t", "tile_scroll_y", "0xff42", context);
        },
        "0xff43": function(context) {
            return global_ptr("uint8_t", "tile_scroll_x", "0xff43", context);
        },
        "0xff44": function(context) {
            return global_ptr("uint8_t", "lcd_coord_y", "0xff44", context);
        },
        "0xff45": function(context) {
            return global_ptr("uint8_t", "lcd_coord_y_cmp", "0xff45", context);
        },
        "0xff46": function(context) {
            return global_ptr("uint8_t", "dma", "0xff46", context);
        },
        "0xff47": function(context) {
            return global_ptr("uint8_t", "bg_palette_data", "0xff47", context);
        },
        "0xff48": function(context) {
            return global_ptr("uint8_t", "obj_palette_0", "0xff48", context);
        },
        "0xff49": function(context) {
            return global_ptr("uint8_t", "obj_palette_1", "0xff49", context);
        },
        "0xff4a": function(context) {
            return global_ptr("uint8_t", "window_pos_y", "0xff4a", context);
        },
        "0xff4b": function(context) {
            return global_ptr("uint8_t", "window_pos_x", "0xff4b", context);
        },
        "0xff4d": function(context) {
            return global_ptr("uint8_t", "key1", "0xff4d", context);
        },
        "0xff4f": function(context) {
            return global_ptr("uint8_t", "vram_bank", "0xff4f", context);
        },
        "0xff56": function(context) {
            return global_ptr("uint8_t", "infra_comm", "0xff56", context);
        },
        "0xff68": function(context) {
            return global_ptr("uint8_t", "bcps_bgpi", "0xff68", context);
        },
        "0xff69": function(context) {
            return global_ptr("uint8_t", "bcpd_bgpd", "0xff69", context);
        },
        "0xff6a": function(context) {
            return global_ptr("uint8_t", "ocps_obpi", "0xff6a", context);
        },
        "0xff6b": function(context) {
            return global_ptr("uint8_t", "ocpd_obpd", "0xff6b", context);
        },
        "0xff70": function(context) {
            return global_ptr("uint8_t", "wram_bank", "0xff70", context);
        },
        "0xffff": function(context) {
            return global_ptr("uint8_t", "int_enable", "0xffff", context);
        },
    };

    function memory_in_range(value, context) {
        var number = parseInt(value) >>> 0;
        if (number > 0x100 && number < 0x4000) {
            // avoid to set it to bank_00 if less than 0x100, because probably is just a number
            return global_ptr("uint8_t", "bank_00", "0x0000", context) + ' + 0x' + number.toString(16);
        } else if (number >= 0x4000 && number <= 0x7fff) {
            return global_ptr("uint8_t", "bank_NN", "0x4000", context) + ' + 0x' + (number - 0x4000).toString(16);
        } else if (number >= 0x8000 && number <= 0x8fff) {
            return global_ptr("uint8_t", "vram_tiles_sprites", "0x8000", context) + ' + 0x' + (number - 0x8000).toString(16);
        } else if (number >= 0x9000 && number <= 0x97ff) {
            return global_ptr("uint8_t", "vram_tiles_alt", "0x9000", context) + ' + 0x' + (number - 0x9000).toString(16);
        } else if (number >= 0x9800 && number <= 0x9bff) {
            return global_ptr("uint8_t", "vram_tilemap_1", "0x9800", context) + ' + 0x' + (number - 0x9800).toString(16);
        } else if (number >= 0x9c00 && number <= 0x9fff) {
            return global_ptr("uint8_t", "vram_tilemap_2", "0x9c00", context) + ' + 0x' + (number - 0x9c00).toString(16);
        } else if (number >= 0xa000 && number <= 0xbfff) {
            return global_ptr("uint8_t", "extern_ram_8KB", "0xa000", context) + ' + 0x' + (number - 0xa000).toString(16);
        } else if (number >= 0xc000 && number <= 0xcfff) {
            return global_ptr("uint8_t", "wram_bank_0", "0xc000", context) + ' + 0x' + (number - 0xc000).toString(16);
        } else if (number >= 0xd000 && number <= 0xdfff) {
            return global_ptr("uint8_t", "wram_bank_n", "0xd000", context) + ' + 0x' + (number - 0xd000).toString(16);
        } else if (number >= 0xe000 && number <= 0xfdff) {
            return global_ptr("uint8_t", "wram_echo", "0xe000", context) + ' + 0x' + (number - 0xe000).toString(16);
        } else if (number >= 0xfe00 && number <= 0xfe9f) {
            return global_ptr("uint8_t", "sprite_attr_tbl", "0xfe00", context) + ' + 0x' + (number - 0xfe00).toString(16);
        }
        return null;
    }

    function resolve_memory(value, context) {
        var mmap = memory_map[value];
        if (mmap) {
            return mmap(context);
        }
        return memory_in_range(value, context) || value;
    }

    function resolve_memory_array(array, context) {
        var mmap = memory_map[array[0]];
        if (mmap) {
            array[0] = mmap(context);
        } else {
            mmap = memory_in_range(array[0], context);
            if (mmap) {
                array[0] = mmap;
            }
        }
        return array.join(' ');
    }

    function is_number(opd, idx) {
        return typeof opd[idx] == 'string' && opd[idx].match(/^0x[\da-fA-F]+$|^\d+$/);
    }

    function auto_value(opd, idx, context) {
        if (is_number(opd, idx)) {
            var number = '0x' + parseInt(opd[idx]).toString(16);
            var mem = resolve_memory(number, context);
            return mem != number ? mem : Variable.number(number);
        }
        return opd[idx];
    }

    function compare(context, a, b) {
        context.cond.a = a;
        context.cond.b = b;
    }

    function condition(instr, context, type) {
        instr.conditional(context.cond.a, context.cond.b, conditionals[type.toUpperCase()]);
    }

    function _create_conditional(instr, context, type, instructions) {
        instr.conditional(context.cond.a, context.cond.b, conditionals[type.toUpperCase()]);
        var pos = instructions.indexOf(instr);
        if (instructions[pos + 1]) {
            instr.jump = instructions[pos + 1].location;
        } else {
            instr.jump = instructions[pos].location.add(1);
        }
    }

    return {
        instructions: {
            dec: function(instr, context, instructions) {
                instr.setBadJump();
                compare(context, instr.parsed.opd[0], '0');
                return Base.decrease(instr.parsed.opd[0], '1');
            },
            inc: function(instr, context, instructions) {
                instr.setBadJump();
                compare(context, instr.parsed.opd[0], '0');
                return Base.increase(instr.parsed.opd[0], '1');
            },
            ccf: function(instr, context, instructions) {
                compare(context, 'a', '0');
                return Base.not('carry', 'carry');
            },
            scf: function(instr, context, instructions) {
                compare(context, 'a', '0');
                return Base.assign('carry', '1');
            },
            cpl: function(instr, context, instructions) {
                compare(context, 'a', '0');
                return Base.not('a', 'a');
            },
            add: function(instr, context, instructions) {
                compare(context, 'a', '0');
                return Base.add('a', 'a', instr.parsed.opd[0]);
            },
            adc: function(instr, context, instructions) {
                compare(context, 'a', '0');
                return Base.composed([
                    Base.add('a', 'a', instr.parsed.opd[0]),
                    Base.add('a', 'a', 'carry')
                ]);
            },
            sub: function(instr, context, instructions) {
                compare(context, 'a', '0');
                return Base.subtract('a', 'a', instr.parsed.opd[0]);
            },
            sbc: function(instr, context, instructions) {
                compare(context, 'a', '0');
                return Base.composed([
                    Base.subtract('a', 'a', instr.parsed.opd[0]),
                    Base.subtract('a', 'a', 'carry')
                ]);
            },
            and: function(instr, context, instructions) {
                compare(context, 'a', '0');
                return Base.and('a', 'a', instr.parsed.opd[0]);
            },
            or: function(instr, context, instructions) {
                compare(context, 'a', '0');
                return Base.or('a', 'a', instr.parsed.opd[0]);
            },
            xor: function(instr, context, instructions) {
                if (instr.parsed.opd[0] == 'a') {
                    context.assigns['a'] = ['0', instr];
                }
                compare(context, 'a', '0');
                return Base.xor('a', 'a', instr.parsed.opd[0]);
            },
            swap: function(instr, context, instructions) {
                return Base.rotate_left(instr.parsed.opd[0], instr.parsed.opd[0], 4, 8);
            },
            rl: function(instr, context, instructions) {
                return Base.rotate_left(instr.parsed.opd[0], instr.parsed.opd[0], 1, 8);
            },
            rlc: function(instr, context, instructions) {
                return Base.rotate_left(instr.parsed.opd[0], instr.parsed.opd[0], 1, 8);
            },
            rr: function(instr, context, instructions) {
                return Base.rotate_right(instr.parsed.opd[0], instr.parsed.opd[0], 1, 8);
            },
            rrc: function(instr, context, instructions) {
                return Base.rotate_right(instr.parsed.opd[0], instr.parsed.opd[0], 1, 8);
            },
            rla: function(instr, context, instructions) {
                return Base.shift_left(instr.parsed.opd[0], instr.parsed.opd[0], 1, 8);
            },
            rlca: function(instr, context, instructions) {
                return Base.shift_left(instr.parsed.opd[0], instr.parsed.opd[0], 1, 8);
            },
            sra: function(instr, context, instructions) {
                return Base.shift_right(instr.parsed.opd[0], instr.parsed.opd[0], 1, 8);
            },
            srl: function(instr, context, instructions) {
                return Base.shift_right(instr.parsed.opd[0], instr.parsed.opd[0], 1, 8);
            },
            ld: function(instr, context, instructions) {
                instr.setBadJump();
                var ptr, opd = instr.parsed.opd;
                if (Extra.is.array(opd[0])) {
                    ptr = resolve_memory_array(opd[0], context);
                    var ass = context.assigns[opd[1]];
                    if (ass) {
                        ass[1].valid = false;
                        ass = ass[0];
                    } else {
                        ass = opd[1];
                    }
                    return Base.write_memory(ptr, ass, 8, false);
                } else if (Extra.is.array(opd[1])) {
                    ptr = resolve_memory_array(opd[1], context);
                    return Base.read_memory(ptr, opd[0], 8, false);
                }
                if (is_number(opd, 1)) {
                    context.assigns[opd[0]] = [opd[1], instr];
                }
                return Base.assign(opd[0], auto_value(opd, 1, context));
            },
            ldd: function(instr, context, instructions) {
                instr.setBadJump();
                var op = null;
                var ptr, opd = instr.parsed.opd;
                if (Extra.is.array(opd[0])) {
                    ptr = opd[0][0];
                    op = Base.write_memory(ptr, auto_value(opd, 1, context), 16, false);
                } else {
                    ptr = opd[1][0];
                    op = Base.read_memory(ptr, auto_value(opd, 0, context), 16, false);
                }
                return Base.composed([op, Base.decrease(ptr, '1')]);
            },
            ldi: function(instr, context, instructions) {
                instr.setBadJump();
                var op = null;
                var ptr, opd = instr.parsed.opd;
                if (Extra.is.array(opd[0])) {
                    ptr = opd[0][0];
                    op = Base.write_memory(ptr, auto_value(opd, 1, context), 16, false);
                } else {
                    ptr = opd[1][0];
                    op = Base.read_memory(ptr, auto_value(opd, 0, context), 16, false);
                }
                return Base.composed([op, Base.increase(ptr, '1')]);
            },
            cp: function(instr, context, instructions) {
                instr.setBadJump();
                compare(context, 'a', auto_value(instr.parsed.opd, 0, context));
                return Base.nop();
            },
            jr: function(instr, context, instructions) {
                var opd = instr.parsed.opd;
                if (opd.length > 1) {
                    condition(instr, context, opd[0]);
                }
                return Base.nop();
            },
            jp: function(instr, context, instructions) {
                return Base.nop();
            },
            call: function(instr, context, instructions) {
                instr.setBadJump();
                if (instr.parsed.opd[0].startsWith('0x')) {
                    return Base.call(global_fcn_ptr(instr.parsed.opd[0], context));
                }
                return Base.call(instr.parsed.opd[0]);
            },
            di: function(instr) {
                return Base.macro('DISABLE_INTERRUPTS', '#define DISABLE_INTERRUPTS __asm(di)');
            },
            ei: function(instr) {
                return Base.macro('ENABLE_INTERRUPTS', '#define ENABLE_INTERRUPTS __asm(ei)');
            },
            halt: function(instr) {
                return Base.macro('HALT_SYSTEM', '#define HALT_SYSTEM __asm(halt)');
            },
            stop: function(instr) {
                return Base.macro('STOP_SYSTEM', '#define STOP_SYSTEM __asm(stop)');
            },
            /*
            push: function(instr, context, instructions) {
                instr.setBadJump();
                return Base.nop();
            },
            pop: function(instr, context, instructions) {
                instr.setBadJump();
                return Base.nop();
            },
            */
            ret: function(instr, context, instructions) {
                instr.setBadJump();
                if (instr.parsed.opd.length > 0) {
                    _create_conditional(instr, context, '-' + instr.parsed.opd[0], instructions);
                }
                return Base.return();
            },
            reti: function(instr, context, instructions) {
                instr.setBadJump();
                if (instr.parsed.opd.length > 0) {
                    _create_conditional(instr, context, '-' + instr.parsed.opd[0], instructions);
                }
                return Base.return();
            },
            nop: function(instr, context, instructions) {
                instr.setBadJump();
                return Base.nop();
            },
            invalid: function(instr, context, instructions) {
                instr.setBadJump();
                return Base.nop();
            }
        },
        parse: function(asm) {
            var ret = asm.trim();
            ret = ret.replace(/^([\w]+)\s/, '$1,').replace(/\s/g, '');
            ret = ret.split(',').map(function(x) {
                return x.charAt(0) == '[' ? x.replace(/\[|\]/g, '').replace(/\+/g, ' + ').split(' ') : x.replace(/\+/g, ' + ');
            });
            return {
                mnem: ret.shift(),
                opd: ret
            };
        },
        context: function() {
            return {
                cond: {
                    a: null,
                    b: null,
                    instr: null
                },
                assigns: {},
                globals: [],
                returns: null
            };
        },
        localvars: function(context) {
            return [];
        },
        globalvars: function(context) {
            return context.globals.sort();
        },
        arguments: function(context) {
            return [];
        },
        returns: function(context) {
            return context.returns == null ? 'void' : 'uint8_t';
        }
    };
});