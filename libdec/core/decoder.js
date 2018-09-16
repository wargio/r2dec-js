module.exports = Decoder;

var Stmt = require('libdec/core/ir/statements');

/**
 * @exports Decoder
 * @constructor
 */
function Decoder(iIj) {
    var a = architectures[iIj.arch];

    this.arch = new a(iIj.bits, iIj.bintype, iIj.endian);
}

/** available architectures */
var architectures = {
    'x86': require('libdec/arch/x86')
};

Decoder.architectures = architectures;

/** Processes assembly listing into a list of generic expressions */
Decoder.prototype.transform_ir = function(aoj) {
    var ir = [];

    aoj.forEach(function(item) {
        var decoded = this.arch.r2decode(item);
        var handler = this.arch.instructions[decoded.mnemonic] || this.arch.invalid;

        console.log(item.opcode);
        handler(decoded).forEach(function(o) {
            console.log('|  ' + o.toString());

            // TODO: 'Stmt' does not really belong here
            ir.push(Stmt.make_statement(decoded.address, o));
        });

    }, this);

    return ir;
};
