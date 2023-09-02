// SPDX-FileCopyrightText: 2023 Giovanni Dante Grazioli <deroad@libero.it>
// SPDX-License-Identifier: BSD-3-Clause

import Long from './long.js';
import JSONex from './JSONex.js';

function _new_evars(issue) {
    let evars = {};
    evars.arch = issue.arch;
    evars.archbits = issue.bits;
    evars.honor = {
        assembly: true,
        blocks: false,
        casts: true,
        offsets: false,
        paddr: false,
        pseudo: false,
        xrefs: false,
    };
    evars.extra = {
        allfuncs: false,
        ascodeline: false,
        ascomment: false,
        debug: true,
        file: 'testsuite',
        highlights: false,
        offset: Long.UZERO,
        slow: true,
        theme: 'default',
        annotation: false,
    };
    return evars;
}

function _new_data(issue) {
    if (!issue.arch) {
        throw new Error('missing architecture in JSON.');
    }
    let bits = issue.archbits || issue.bits || 32;
    if (bits) {
        // if bits is in the issue then it has been decoded as a Long object.
        // to override this is required to be converted to just an integer.
        bits = parseInt(bits.toString());
    }
    return {
        arch: issue.arch,
        bits: bits,
        graph: issue.agj || [],
        xrefs: {
            symbols: issue.isj || [],
            strings: issue.Csj || issue.izj || [],
            functions: issue.aflj || [],
            classes: issue.icj || [],
            arguments: issue.afvj || {
                "sp": [],
                "bp": [],
                "reg": []
            }
        },
        argdb: issue.afcfj
    };
}

export default function(filename) {
    const issue = JSONex.parse(unit.raw);
    this.data = _new_data(issue);
    this.evars = _new_evars(this.data);
}