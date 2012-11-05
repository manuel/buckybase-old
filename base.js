var base = (function() {

    /*** Infoset ***/

    function Bool(jsbool) {
        if (!((jsbool == true) || (jsbool === false))) err("Not a boolean", jsbool);
        this.jsbool = jsbool;
    }
    function bool_val(jsbool) { return new Bool(jsbool); }
    Bool.prototype.toJSON = function() { return this.jsbool; }

    var decimal_re = /^(\+|-)?(\d+(\.\d+)?)$/;
    function is_decimal(s) { return String(s).search(decimal_re) !== -1 };
    function Num(numrepr) {
        numrepr = numrepr.toString();
        if (!is_decimal(numrepr)) err("Not decimal", numrepr);
        this.bb$n = numrepr;
    }
    function num_val(numrepr) { return new Num(numrepr); }

    function Str(jsstr) {
        if (!is_string(jsstr)) err("Not a string", jsstr);
        this.jsstr = jsstr;
    }
    function str_val(jsstr) { return new Str(jsstr); }
    Str.prototype.toJSON = function() { return this.jsstr; };

    function List(array) {
        if (!(array instanceof Array)) err("Not an array", array);
        this.array = array;
    }
    function list_val(array) { return new List(array); }
    List.prototype.toJSON = function() { return this.array; };

    function Dict(entries) {
        if (!(entries instanceof Array)) err("Bad dictionary", entries);
        for (var i = 0; i < entries.length; i++) {
            var entry = entries[i];
            if ((!(entry instanceof Array)) || (entry.length !== 2))
                err("Bad dictionary entry", entry);
        }
        this.bb$d = entries;
    }
    function dict_val(entries) { return new Dict(entries); }

    function Bin(b64, mime_type) {
        if (!is_string(b64)) err("Not a Base64 string", b64);
        this.bb$b = b64;
        if (mime_type !== undefined) {
            if (!is_string(mime_type)) err("Not a MIME type string", mime_type);
            this.type = mime_type;
        }
    }
    function bin_val(b64, mime_type) { return new Bin(b64, mime_type); }

    function err(msg, arg) { throw msg + ": " + JSON.stringify(arg); }
    function is_string(s) { return s.indexOf !== undefined; }

    return {
        bool_val: bool_val,
        num_val: num_val,
        str_val: str_val,
        list_val: list_val,
        dict_val: dict_val,
        bin_val: bin_val,
        err: err
    };
}());

function base_test() {
    function assert(bool) {
        if (!bool) base.err("Assertion failed");
    }
    function should_throw(thunk) {
        try { thunk(); } catch(whatever) { return; }
        base.err("Should throw but didn't", thunk);
    }
    assert(JSON.stringify(base.bool_val(true)) === "true");
    assert(JSON.stringify(base.bool_val(false)) === "false");
    should_throw(function() { base.bool_val(12); });
    should_throw(function() { base.bool_val("foo"); });
    assert(JSON.stringify(base.num_val(-12.34)) === '{"bb$n":"-12.34"}');
    assert(JSON.stringify(base.num_val("-12.34")) === '{"bb$n":"-12.34"}');
    assert(JSON.stringify(base.num_val(0.1)) === '{"bb$n":"0.1"}');
    assert(JSON.stringify(base.num_val("0.1")) === '{"bb$n":"0.1"}');
    should_throw(function() { base.num_val("foo"); });
    should_throw(function() { base.num_val(NaN); });
    should_throw(function() { base.num_val("1."); });
    should_throw(function() { base.num_val(".1"); });
    assert(JSON.stringify(base.str_val("foo")) === '"foo"');
    assert(JSON.stringify(base.str_val("\"")) === '"\\""');
    should_throw(function() { base.str_val(12); });
    should_throw(function() { base.str_val(true); });
    assert(JSON.stringify(base.str_val("foo")) === '"foo"');
    assert(JSON.stringify(base.str_val("\"")) === '"\\""');
    should_throw(function() { base.str_val(12); });
    should_throw(function() { base.str_val(true); });
    assert(JSON.stringify(base.dict_val([])) === '{"bb$d":[]}');
    assert(JSON.stringify(base.dict_val([[1,2]])) === '{"bb$d":[[1,2]]}');
    assert(JSON.stringify(base.dict_val([[1,2], [3,4]])) === '{"bb$d":[[1,2],[3,4]]}');
    should_throw(function() { base.dict_val(12); });
    should_throw(function() { base.dict_val(true); });
    should_throw(function() { base.dict_val([[]]); });
    should_throw(function() { base.dict_val([[1]]); });
    should_throw(function() { base.dict_val([[1, 2], []]); });
    should_throw(function() { base.dict_val([[1, 2], [3]]); });
    assert(JSON.stringify(base.bin_val("aGVsbG8gd29ybGQK")) === '{"bb$b":"aGVsbG8gd29ybGQK"}');
    assert(JSON.stringify(base.bin_val("aGVsbG8gd29ybGQK", "text/plain"))
           === '{"bb$b":"aGVsbG8gd29ybGQK","type":"text/plain"}');
    should_throw(function() { base.bin_val(1); });
    should_throw(function() { base.bin_val(true); });
    should_throw(function() { base.bin_val("aGVsbG8gd29ybGQK", 1); });
    should_throw(function() { base.bin_val("aGVsbG8gd29ybGQK", true); });
}

base_test();
