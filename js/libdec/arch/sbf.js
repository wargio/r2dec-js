// SPDX-FileCopyrightText: 2024 r2dec contributors
// SPDX-License-Identifier: BSD-3-Clause

import Base from '../core/base.js';
import Variable from '../core/variable.js';
import Extra from '../core/extra.js';

// Minimal sBPF (Solana BPF) support.
// This aims to be safe defaults to avoid crashes and provide
// readable pseudo for common ops (mov/alu/ldx/stx/jumps/call/exit).

const REG_NAMES = Array.from({ length: 11 }, (_, i) => 'r' + i);

function init_registers() {
    const regs = {};
    for (const r of REG_NAMES) {
        regs[r] = Variable.local(r, 'uint64_t');
    }
    // r10 is frame pointer in eBPF/sBPF
    regs.fp = regs.r10;
    return regs;
}

// Linux eBPF helper IDs (subset). Keys are decimal strings.
const HELPER_NAMES = {
    '1':  'bpf_map_lookup_elem',
    '2':  'bpf_map_update_elem',
    '3':  'bpf_map_delete_elem',
    '4':  'bpf_probe_read',
    '5':  'bpf_ktime_get_ns',
    '6':  'bpf_trace_printk',
    '7':  'bpf_get_prandom_u32',
    '8':  'bpf_get_smp_processor_id',
    '9':  'bpf_skb_store_bytes',
    '10': 'bpf_l3_csum_replace',
    '11': 'bpf_l4_csum_replace',
    '12': 'bpf_tail_call',
    '13': 'bpf_clone_redirect',
    '14': 'bpf_get_current_pid_tgid',
    '15': 'bpf_get_current_uid_gid',
    '16': 'bpf_get_current_comm',
    '17': 'bpf_get_cgroup_classid',
    '18': 'bpf_skb_vlan_push',
    '19': 'bpf_skb_vlan_pop',
    '20': 'bpf_skb_get_tunnel_key',
    '21': 'bpf_skb_set_tunnel_key',
    '22': 'bpf_perf_event_read',
    '23': 'bpf_redirect',
    '24': 'bpf_get_route_realm',
    '25': 'bpf_perf_event_output',
    '26': 'bpf_skb_load_bytes',
    '27': 'bpf_get_stackid',
    '28': 'bpf_csum_diff',
    '29': 'bpf_skb_get_tunnel_opt',
    '30': 'bpf_skb_set_tunnel_opt',
    '31': 'bpf_skb_change_proto',
    '32': 'bpf_skb_change_type',
    '33': 'bpf_skb_under_cgroup',
    '34': 'bpf_get_hash_recalc',
    '35': 'bpf_get_current_task',
    '36': 'bpf_probe_write_user',
    '37': 'bpf_current_task_under_cgroup',
    '38': 'bpf_skb_change_tail',
    '39': 'bpf_skb_pull_data',
    '40': 'bpf_csum_update',
    '41': 'bpf_set_hash_invalid',
    '42': 'bpf_get_numa_node_id',
    '43': 'bpf_skb_change_head',
    '44': 'bpf_xdp_adjust_head',
    '45': 'bpf_probe_read_str',
    '46': 'bpf_get_socket_cookie',
    '47': 'bpf_get_socket_uid',
    '48': 'bpf_set_hash',
    '49': 'bpf_setsockopt',
    '50': 'bpf_skb_adjust_room',
    '51': 'bpf_redirect_map',
    '52': 'bpf_sk_redirect_map',
    '53': 'bpf_sock_map_update',
    '54': 'bpf_xdp_adjust_meta',
    '55': 'bpf_perf_event_read_value',
    '56': 'bpf_perf_prog_read_value',
    '57': 'bpf_getsockopt',
    '58': 'bpf_override_return',
    '59': 'bpf_sock_ops_cb_flags_set',
    '60': 'bpf_msg_redirect_map',
    '61': 'bpf_msg_apply_bytes',
    '62': 'bpf_msg_cork_bytes',
    '63': 'bpf_msg_pull_data',
    '64': 'bpf_bind',
    '65': 'bpf_xdp_adjust_tail',
    '67': 'bpf_get_stack',
    '69': 'bpf_fib_lookup',
    '70': 'bpf_sock_hash_update'
};

function helper_name_from_token(tok) {
    let n;
    if (/^0x[0-9a-f]+$/i.test(tok)) {
        n = parseInt(tok, 16);
    } else if (/^\d+$/.test(tok)) {
        n = parseInt(tok, 10);
    } else {
        return null;
    }
    const key = String(n);
    return HELPER_NAMES[key] || null;
}

function helper_args_list() {
    // eBPF calling convention: up to 5 args in r1..r5
    return ['r1', 'r2', 'r3', 'r4', 'r5'];
}

function bits_from_mnem(mnem) {
    // ldx/stx variants typically encode size in suffix
    // e.g. ldxw/ldxh/ldxb/ldxdw, stxw/.., stxdw
    if (/dw$/i.test(mnem)) {
        return 64;
    }
    if (/w$/i.test(mnem)) {
        return 32;
    }
    if (/h$/i.test(mnem)) {
        return 16;
    }
    if (/b$/i.test(mnem)) {
        return 8;
    }
    return 64; // default register width
}

function parse_mem(op) {
    // Accept "[rX]" or "[rX + off]" or variants with spaces
    const m = op.match(/^\[(.*)\]$/);
    if (!m) {
        return op.trim();
    }
    let inner = m[1].trim().replace(/\s*\+\s*/g, ' + ');
    inner = inner.replace(/\s*\-\s*/g, ' - ');
    return inner;
}

function parse_stack_access(ptr) {
    // Accept variants like: r10 - 0x40, r10 + -64, r10 + 8
    const s = ptr.trim();
    if (!/^r10(\s|$)/i.test(s)) {
        return null;
    }
    // Remove leading r10 and spaces
    let rest = s.replace(/^r10\s*/, '');
    if (!rest) {
        return { base: 'r10', offset: 0 };
    }
    const m = rest.match(/^([+-])\s*(0x[0-9a-fA-F]+|-?\d+)/);
    if (!m) {
        // Could be something like r10 + rX -> not a pure stack slot
        return null;
    }
    const sign = m[1] === '-' ? -1 : 1;
    let val = m[2];
    let n;
    if (/^0x/i.test(val)) {
        n = parseInt(val, 16);
    } else {
        n = parseInt(val, 10);
    }
    if (isNaN(n)) {
        return null;
    }
    const off = sign * n;
    return { base: 'r10', offset: off };
}

function type_for_bits(bits) {
    return Extra.to.type(bits, false);
}

function type_bits(t) {
    const m = (t || '').match(/(\d+)_t$/);
    return m ? parseInt(m[1], 10) : 64;
}

function ensure_stack_local(context, offset, bits) {
    const abs = Math.abs(offset);
    const key = 'off_' + abs.toString(16);
    let v = context.locals[key];
    if (!v) {
        const name = 'var_' + abs.toString(16);
        v = Variable.local(name, type_for_bits(bits));
        context.locals[key] = v;
    } else {
        const cur = type_bits(v.type);
        if (bits > cur) {
            v.type = type_for_bits(bits);
        }
    }
    return v;
}

function binop(op) {
    switch (op) {
        case 'add':
        case 'add64':
            return Base.add;
        case 'sub':
        case 'sub64':
            return Base.subtract;
        case 'mul':
        case 'mul64':
            return Base.multiply;
        case 'div':
        case 'div64':
            return Base.divide;
        case 'and':
        case 'and64':
            return Base.and;
        case 'or':
        case 'or64':
            return Base.or;
        case 'xor':
        case 'xor64':
            return Base.xor;
        case 'lsh':
        case 'lsh64':
            return Base.shift_left;
        case 'rsh':
        case 'rsh64':
        case 'arsh':
        case 'arsh64':
            return Base.shift_right;
        default:
            return null;
    }
}

const _cmp_map = {
    jeq: 'EQ',
    jne: 'NE',
    jgt: 'GT',
    jge: 'GE',
    jlt: 'LT',
    jle: 'LE',
    jsgt: 'GT',
    jsge: 'GE',
    jslt: 'LT',
    jsle: 'LE',
    jset: 'AND', // treated specially: (a & b) != 0
    jeq32: 'EQ',
    jne32: 'NE',
    jgt32: 'GT',
    jge32: 'GE',
    jlt32: 'LT',
    jle32: 'LE',
};

function cmp_instruction(instr) {
    const m = instr.parsed.mnem;
    const opd = instr.parsed.opd.slice();
    // Expect formats like: jxx rA, rB|imm, 0xaddr or jxx rA, imm, +off
    // We rely on Instruction.jump already set by r2; just attach condition.
    if (m === 'jset') {
        // If (a & b) != 0
        const a = opd[0];
        const b = opd[1];
        instr.conditional(`(${a} & ${b})`, '0', 'NE');
        return Base.nop();
    }
    const type = _cmp_map[m] || 'EQ';
    const a = opd[0];
    const b = opd[1] ?? '0';
    instr.conditional(a, b, type);
    return Base.nop();
}

const sbf = {
    instructions: {
        // Moves
        mov: function(instr) {
            instr.setBadJump();
            const [dst, src] = instr.parsed.opd;
            return Base.assign(dst, src);
        },
        mov64: function(instr) {
            instr.setBadJump();
            const [dst, src] = instr.parsed.opd;
            return Base.assign(dst, src);
        },

        // ALU ops
        add: function(instr) { const f = binop('add'); instr.setBadJump(); const o=instr.parsed.opd; return f(o[0], o[0], o[1]); },
        add64: function(instr) { const f = binop('add64'); instr.setBadJump(); const o=instr.parsed.opd; return f(o[0], o[0], o[1]); },
        sub: function(instr) { const f = binop('sub'); instr.setBadJump(); const o=instr.parsed.opd; return f(o[0], o[0], o[1]); },
        sub64: function(instr) { const f = binop('sub64'); instr.setBadJump(); const o=instr.parsed.opd; return f(o[0], o[0], o[1]); },
        mul: function(instr) { const f = binop('mul'); instr.setBadJump(); const o=instr.parsed.opd; return f(o[0], o[0], o[1]); },
        mul64: function(instr) { const f = binop('mul64'); instr.setBadJump(); const o=instr.parsed.opd; return f(o[0], o[0], o[1]); },
        div: function(instr) { const f = binop('div'); instr.setBadJump(); const o=instr.parsed.opd; return f(o[0], o[0], o[1]); },
        div64: function(instr) { const f = binop('div64'); instr.setBadJump(); const o=instr.parsed.opd; return f(o[0], o[0], o[1]); },
        and: function(instr) { const f = binop('and'); instr.setBadJump(); const o=instr.parsed.opd; return f(o[0], o[0], o[1]); },
        and64: function(instr) { const f = binop('and64'); instr.setBadJump(); const o=instr.parsed.opd; return f(o[0], o[0], o[1]); },
        or:  function(instr) { const f = binop('or');  instr.setBadJump(); const o=instr.parsed.opd; return f(o[0], o[0], o[1]); },
        or64:  function(instr) { const f = binop('or64');  instr.setBadJump(); const o=instr.parsed.opd; return f(o[0], o[0], o[1]); },
        xor: function(instr) { const f = binop('xor'); instr.setBadJump(); const o=instr.parsed.opd; return f(o[0], o[0], o[1]); },
        xor64: function(instr) { const f = binop('xor64'); instr.setBadJump(); const o=instr.parsed.opd; return f(o[0], o[0], o[1]); },
        lsh: function(instr) { const f = binop('lsh'); instr.setBadJump(); const o=instr.parsed.opd; return f(o[0], o[0], o[1]); },
        lsh64: function(instr) { const f = binop('lsh64'); instr.setBadJump(); const o=instr.parsed.opd; return f(o[0], o[0], o[1]); },
        rsh: function(instr) { const f = binop('rsh'); instr.setBadJump(); const o=instr.parsed.opd; return f(o[0], o[0], o[1]); },
        rsh64: function(instr) { const f = binop('rsh64'); instr.setBadJump(); const o=instr.parsed.opd; return f(o[0], o[0], o[1]); },
        arsh:function(instr) { const f = binop('arsh'); instr.setBadJump(); const o=instr.parsed.opd; return f(o[0], o[0], o[1]); },
        arsh64:function(instr) { const f = binop('arsh64'); instr.setBadJump(); const o=instr.parsed.opd; return f(o[0], o[0], o[1]); },
        neg: function(instr) {
            instr.setBadJump();
            const [dst] = instr.parsed.opd;
            return Base.assign(dst, '(0 - ' + dst + ')');
        },

        // Loads (ldx*) and stores (stx*)
        // lddw is eBPF's 64-bit immediate load into a register
        lddw: function(instr) {
            instr.setBadJump();
            const [dst, imm] = instr.parsed.opd;
            return Base.assign(dst, imm);
        },
        ldx: function(instr, context) {
            instr.setBadJump();
            const bits = bits_from_mnem(instr.parsed.orig_mnem || instr.parsed.mnem);
            const [dst, mem] = instr.parsed.opd;
            const ptr = parse_mem(mem);
            const st = parse_stack_access(ptr);
            if (st && st.base === 'r10') {
                const v = ensure_stack_local(context, st.offset, bits);
                return Base.assign(dst, v.toString());
            }
            return Base.read_memory(ptr, dst, bits, false);
        },
        stx: function(instr, context) {
            instr.setBadJump();
            const bits = bits_from_mnem(instr.parsed.orig_mnem || instr.parsed.mnem);
            const a = instr.parsed.opd[0];
            const b = instr.parsed.opd[1];
            const isPtrA = /^\[/.test(a);
            const ptr = parse_mem(isPtrA ? a : b);
            const src = isPtrA ? b : a;
            const st = parse_stack_access(ptr);
            if (st && st.base === 'r10') {
                const v = ensure_stack_local(context, st.offset, bits);
                return Base.assign(v.toString(), src);
            }
            return Base.write_memory(ptr, src, bits, false);
        },

        // Jumps
        // Radare can emit unconditional jumps as 'jmp' (alias of 'ja').
        jmp: function(instr) {
            // unconditional jump; rely on control flow graph
            return Base.nop();
        },
        ja: function(instr) {
            // unconditional jump; rely on control flow graph
            return Base.nop();
        },
        jeq: cmp_instruction,
        jne: cmp_instruction,
        jgt: cmp_instruction,
        jge: cmp_instruction,
        jlt: cmp_instruction,
        jle: cmp_instruction,
        jsgt: cmp_instruction,
        jsge: cmp_instruction,
        jslt: cmp_instruction,
        jsle: cmp_instruction,
        jset: cmp_instruction,

        // Calls and return
        call: function(instr) {
            const opd = instr.parsed.opd;
            if (opd.length === 1) {
                const tok = opd[0];
                const hname = helper_name_from_token(tok);
                if (hname) {
                    return Base.call(hname, helper_args_list());
                }
                if (/^0x[0-9a-f]+$/i.test(tok) || /^\d+$/.test(tok)) {
                    const name = (/^0x/.test(tok) ? ('fcn_' + tok) : ('helper_' + tok));
                    return Base.call(name, helper_args_list());
                }
                // textual symbol name
                return Base.call(tok, helper_args_list());
            }
            return Base.call('helper', opd);
        },
        exit: function(instr, context) {
            // Return value is r0
            return Base.return(context && context.regs && context.regs.r0 ? context.regs.r0 : 'r0');
        },

        // Fallbacks
        nop: function() { return Base.nop(); },
        invalid: function() { return Base.nop(); },
    },

    parse: function(assembly /*, simplified */) {
        // Normalize: lower-case mnemonic, split operands by comma
        let asm = assembly.trim();
        // remove comments after ';' if present
        asm = asm.replace(/;.*$/, '').trim();
        // collapse whitespace
        asm = asm.replace(/\s+/g, ' ');
        const sp = asm.split(' ');
        let mnem = sp.shift() || '';
        const rest = sp.join(' ');
        let opd = [];
        if (rest.length) {
            opd = rest.split(',').map(x => x.trim()).filter(Boolean);
        }

        // Unify load/store mnemonics to ldx/stx base handlers; keep original in orig_mnem
        const orig = mnem.toLowerCase();
        if (/^ldx/.test(orig)) {
            mnem = 'ldx';
        } else if (/^stx/.test(orig)) {
            mnem = 'stx';
        } else {
            mnem = orig;
        }

        return {
            mnem: mnem,
            opd: opd,
            orig_mnem: orig,
        };
    },

    context: function() {
        return {
            regs: init_registers(),
            locals: {}, // stack slots discovered via r10 + offset
        };
    },

    globalvars: function(/* context */) {
        return [];
    },
    localvars: function(context) {
        // Emit discovered stack slots as locals
        return Object.keys(context.locals).map(k => context.locals[k].toString(true));
    },
    arguments: function(/* context */) {
        return [];
    },
    returns: function(/* context */) {
        // sBPF ABI returns 64-bit in r0
        return 'uint64_t';
    }
};

export default sbf;
