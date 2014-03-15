///// Buckybase Utilities

var bbutil = Object.create(null);

// UTF8 encoding / decoding

bbutil.UTF8 = function UTF8(utf8_string) {
    this.utf8_string = bbutil.assert_string(utf8_string);
}

bbutil.internal_make_utf8 = function(utf8_string) {
    return new bbutil.UTF8(utf8_string);
}

bbutil.utf8_encode = function(js_string) {
    bbutil.assert_string(js_string);
    return bbutil.internal_make_utf8(unescape(encodeURIComponent(js_string)));
}

bbutil.utf8_decode = function(utf8) {
    return decodeURIComponent(escape(bbutil.get_utf8_string(utf8)));
}

bbutil.get_utf8_string = function(utf8) {
    return bbutil.assert_type(utf8, bbutil.UTF8).utf8_string;
}

bbutil.utf8_to_binary = function(utf8) {
    return bbutil.string_to_binary(bbutil.get_utf8_string(utf8));
}

bbutil.string_to_binary = function(str) {
    bbutil.assert_string(str);
    return TextEncoder("utf-8").encode(str);
}

bbutil.utf8_from_binary = function(binary) {
    bbutil.assert_type(binary, Uint8Array);
    return bbutil.internal_make_utf8(bbutil.string_from_binary(binary));
}

bbutil.string_from_binary = function(binary) {
    bbutil.assert_type(binary, Uint8Array);
    return TextDecoder("utf-8").decode(binary);
}

// Binary utilities

bbutil.append_binaries = function(a, b) {
    bbutil.assert_type(a, Uint8Array);
    bbutil.assert_type(b, Uint8Array);
    var c = new Uint8Array(a.length + b.length);
    c.set(a);
    c.set(b, a.length);
    return c;
}

bbutil.binary_index_of = function(bin, byte) {
    bbutil.assert_type(bin, Uint8Array);
    bbutil.assert_number(byte);
    for (var i = 0; i < bin.length; i++) {
        if (bin[i] === byte) {
            return i;
        }
    }
    return -1;
}

bbutil.hex_string_to_binary = function(str) {
    bbutil.assert_string(str);
    bbutil.assert((str.length % 2) === 0);
    var array = new Uint8Array(str.length / 2);
    var i = 0;
    str.replace(/(..)/g, function(doublette) {
        array[i++] = parseInt(doublette, 16);
    });
    return array;
}

bbutil.binary_to_hex_string = function(binary) {
    bbutil.assert_type(binary, Uint8Array);
    var ret = "";
    for (var i = 0; i < binary.length; i++) {
        ret += (binary[i] < 16 ? "0" : "") + binary[i].toString(16);
    }
    return ret;
}

// Sanity checking utilities

bbutil.assert = function(b) {
    if (!(b === true)) {
        bbutil.error("Assertion failed.");
    }
}

bbutil.assert_type = function(object, type) {
    if (!(object instanceof type)) {
        bbutil.error(object + " not an instance of " + type);
    }
    return object;
}

bbutil.assert_array_type = function(array, type) {
    bbutil.assert_type(array, Array);
    array.forEach(function(elt) { bbutil.assert_type(elt, type); });
    return array;
}

bbutil.is_string = function(s) {
    return typeof s === "string" || s instanceof String;
}

bbutil.assert_string = function(s) {
    if (!bbutil.is_string(s)) {
        bbutil.error("Not a string: " + s);
    }
    return s;
}

bbutil.is_number = function(n) {
    return typeof n === "number" || n instanceof Number;
}

bbutil.assert_number = function(n) {
    if (!bbutil.is_number(n)) {
        bbutil.error("Not a number: " + n);
    }
    return n;
}

// Errors

bbutil.Error = function Error(msg) {
    this.msg = msg;
}

bbutil.Error.prototype.toString = function() {
    return this.msg;
}

bbutil.error = function(msg) {
    throw new bbutil.Error(msg);
}

// Acknowledgements
//
// UTF8 encoding/decoding adapted from http://ecmanaut.blogspot.com/2006/07/encoding-decoding-utf8-in-javascript.html
//
// Hex to Uint8Array adapted from http://named-data.net/doc/0.2/ndn-js/doc/DataUtils.js.html
