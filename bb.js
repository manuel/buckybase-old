var buckybase = Object.create(null);

//// Content-addressed store

buckybase.TREE_TYPE = "tree";
buckybase.BLOB_TYPE = "blob";
buckybase.COMMIT_TYPE = "commit";

buckybase.TREE_MODE = "40000";
buckybase.BLOB_MODE = "100644";

buckybase.COMMIT_TREE = "tree";
buckybase.COMMIT_PARENT = "parent";
buckybase.COMMIT_AUTHOR = "author";
buckybase.COMMIT_COMMITTER = "committer";

/// Data model

// Blob

buckybase.Blob = function Blob(data) {
    this.data = buckybase.assert_type(data, Uint8Array);
}

buckybase.make_blob = function(data) {
    return new buckybase.Blob(data);
}

buckybase.get_blob_data = function(blob) {
    return buckybase.assert_type(blob, buckybase.Blob).data;
}

buckybase.blob_size = function(blob) {
    return buckybase.assert_type(blob, buckybase.Blob).data.length;
}

// Tree

buckybase.Tree = function Tree() {
    this.entries = Object.create(null);
}

buckybase.make_tree = function() {
    return new buckybase.Tree();
}

buckybase.tree_put = function(tree, name, entry) {
    buckybase.assert_type(tree, buckybase.Tree);
    buckybase.assert_type(name, buckybase.UTF8);
    buckybase.assert_type(entry, buckybase.TreeEntry);
    var utf8_string = buckybase.get_utf8_string(name);
    buckybase.assert(utf8_string.indexOf("\0") === -1);
    tree.entries[utf8_string] = entry;
}

buckybase.tree_get = function(tree, name) {
    buckybase.assert_type(tree, buckybase.Tree);
    buckybase.assert_type(name, buckybase.UTF8);
    return tree.entries[buckybase.get_utf8_string(name)];
}

buckybase.tree_names = function(tree) {
    buckybase.assert_type(tree, buckybase.Tree);
    return Object.keys(tree.entries).sort().map(buckybase.internal_make_utf8);
}

// Tree Entry

buckybase.TreeEntry = function TreeEntry(hash, type) {
    this.hash = buckybase.assert_type(hash, buckybase.Hash);
    this.type = buckybase.assert_tree_entry_type(type);
}

buckybase.internal_make_tree_entry = function(hash, type) {
    return new buckybase.TreeEntry(hash, type);
}

buckybase.make_tree_entry_for_blob = function(hash) {
    return buckybase.internal_make_tree_entry(hash, buckybase.BLOB_TYPE);
}

buckybase.make_tree_entry_for_tree = function(hash) {
    return buckybase.internal_make_tree_entry(hash, buckybase.TREE_TYPE);
}

buckybase.get_tree_entry_hash = function(entry) {
    return buckybase.assert_type(entry, buckybase.TreeEntry).hash;
}

buckybase.get_tree_entry_type = function(entry) {
    return buckybase.assert_type(entry, buckybase.TreeEntry).type;
}

buckybase.assert_tree_entry_type = function(type) {
    buckybase.assert((type === buckybase.TREE_TYPE) || (type === buckybase.BLOB_TYPE));
    return type;
}

buckybase.tree_entry_mode = function(entry) {
    return buckybase.mode_from_type(buckybase.get_tree_entry_type(entry));
}

buckybase.mode_from_type = function(type) {
    buckybase.assert_string(type);
    switch(type) {
    case buckybase.BLOB_TYPE: return buckybase.BLOB_MODE;
    case buckybase.TREE_TYPE: return buckybase.TREE_MODE;
    default: buckybase.error("Unknown type: " + type);
    }
}

buckybase.type_from_mode = function(mode) {
    buckybase.assert_string(mode);
    switch(mode) {
    case buckybase.BLOB_MODE: return buckybase.BLOB_TYPE;
    case buckybase.TREE_MODE: return buckybase.TREE_TYPE;
    default: buckybase.error("Unknown mode: " + mode);
    }
}

// Commit

buckybase.Commit = function Commit(tree_hash, parent_hashes, author, committer, message) {
    this.tree_hash = buckybase.assert_type(tree_hash, buckybase.Hash);
    this.parent_hashes = buckybase.assert_array_type(parent_hashes, buckybase.Hash);
    this.author = buckybase.assert_type(author, buckybase.Committer);
    this.committer = buckybase.assert_type(committer, buckybase.Committer);
    this.message = buckybase.assert_type(message, buckybase.UTF8);
}

buckybase.Committer = function Committer(name, email, timestamp, timezone) {
    this.name = buckybase.assert_type(name, buckybase.UTF8);
    this.email = buckybase.assert_type(email, buckybase.UTF8);
    this.timestamp = buckybase.assert_number(timestamp);
    this.timezone = buckybase.assert_type(timezone, buckybase.UTF8);
}

buckybase.make_commit = function(tree_hash, parent_hashes, author, committer, message) {
    return new buckybase.Commit(tree_hash, parent_hashes, author, committer, message);
}

buckybase.make_committer = function(name, email, timestamp, timezone) {
    return new buckybase.Committer(name, email, timestamp, timezone);
}

buckybase.Commit.prototype.toString = function() {
    return buckybase.COMMIT_TREE + " " + this.tree_hash.toString() + "\n"
        + this.parent_hashes.map(function(ph) { return buckybase.COMMIT_PARENT + " " + ph.toString() }).join("\n")
        + buckybase.COMMIT_AUTHOR + " " + this.author.toString() + "\n"
        + buckybase.COMMIT_COMMITTER + " " + this.committer.toString() + "\n"
        + "\n"
        + buckybase.get_utf8_string(this.message);
}

buckybase.Committer.prototype.toString = function() {
    return buckybase.get_utf8_string(this.name) + 
        " <" + buckybase.get_utf8_string(this.email) + "> "
        + this.timestamp + " " 
        + buckybase.get_utf8_string(this.timezone);
}

//// Git Format

/// Writing

buckybase.GitData = function GitData(hash, data) {
    this.hash = buckybase.assert_type(hash, buckybase.Hash);
    this.data = buckybase.assert_type(data, Uint8Array);
}

buckybase.make_git_data = function(hash, data) {
    return new buckybase.GitData(hash, data);
}

buckybase.object_to_git_data = function(obj) {
    return obj.object_to_git_data();
}

buckybase.Blob.prototype.object_to_git_data = function() {
    return buckybase.blob_to_git_data(this);
}

buckybase.Tree.prototype.object_to_git_data = function() {
    return buckybase.tree_to_git_data(this);
}

buckybase.Commit.prototype.object_to_git_data = function() {
    return buckybase.commit_to_git_data(this);
}

buckybase.blob_to_git_data = function(blob) {
    buckybase.assert_type(blob, buckybase.Blob);
    var prefix = buckybase.utf8_encode(buckybase.BLOB_TYPE + " " + buckybase.blob_size(blob) + "\0");
    var prefix_array = buckybase.utf8_to_uint8array(prefix);
    var array = buckybase.append_uint8arrays(prefix_array, buckybase.get_blob_data(blob));
    var hash = buckybase.sha1(array);
    return buckybase.make_git_data(hash, array);
}

buckybase.tree_to_git_data = function(tree) {
    buckybase.assert_type(tree, buckybase.Tree);
    var data = new Uint8Array(0);
    buckybase.tree_names(tree).forEach(function(name) {
        var entry = buckybase.tree_get(tree, name);
        data = buckybase.append_uint8arrays(data, buckybase.tree_entry_to_git_uint8array(name, entry));
    });
    var prefix = buckybase.utf8_encode(buckybase.TREE_TYPE + " " + data.length + "\0");
    var prefix_array = buckybase.utf8_to_uint8array(prefix);
    var array = buckybase.append_uint8arrays(prefix_array, data);
    var hash = buckybase.sha1(array);
    return buckybase.make_git_data(hash, array);
}

buckybase.tree_entry_to_git_uint8array = function(name, entry) {
    buckybase.assert_type(name, buckybase.UTF8);
    buckybase.assert_type(entry, buckybase.TreeEntry);
    var mode = buckybase.tree_entry_mode(entry);
    var prefix = buckybase.utf8_encode(mode + " " + buckybase.get_utf8_string(name) + "\0");
    var prefix_array = buckybase.utf8_to_uint8array(prefix);
    var hash_array = buckybase.get_hash_array(buckybase.get_tree_entry_hash(entry));
    return buckybase.append_uint8arrays(prefix_array, hash_array);
}

buckybase.commit_to_git_data = function(commit) {
    buckybase.assert_type(commit, buckybase.Commit);
    var data = new Uint8Array(0);
    function add_utf8(s) {
        data = buckybase.append_uint8arrays(data, buckybase.utf8_to_uint8array(s));
    }

    add_utf8(buckybase.utf8_encode(buckybase.COMMIT_TREE + " " + commit.tree_hash.toString() + "\n"));
    commit.parent_hashes.forEach(function(parent_hash) {
        add_utf8(buckybase.utf8_encode(buckybase.COMMIT_PARENT + " " + parent_hash.toString() + "\n"));
    });
    add_utf8(buckybase.utf8_encode(buckybase.COMMIT_AUTHOR + " " + commit.author.toString() + "\n"));
    add_utf8(buckybase.utf8_encode(buckybase.COMMIT_COMMITTER + " " + commit.committer.toString() + "\n"));
    add_utf8(buckybase.utf8_encode("\n"));
    add_utf8(commit.message);

    var prefix = buckybase.utf8_encode(buckybase.COMMIT_TYPE + " " + data.length + "\0");
    var prefix_array = buckybase.utf8_to_uint8array(prefix);
    var array = buckybase.append_uint8arrays(prefix_array, data);
    var hash = buckybase.sha1(array);
    return buckybase.make_git_data(hash, array);
}

/// Reading

buckybase.object_from_git_uint8array = function(bin) {
    buckybase.assert_type(bin, Uint8Array);
    var ix = buckybase.binary_index_of(bin, 0);
    if (ix === -1) {
        buckybase.error("Doesn't contain NUL byte, probably ill-formatted Git data: " + bin);
    }
    var prefix = buckybase.string_from_uint8array(bin.subarray(0, ix));
    var type_and_size = prefix.split(" ");
    if (type_and_size.length !== 2) {
        buckybase.error("Git data prefix doesn't consist of type and size: " + prefix);
    }
    var type = type_and_size[0];
    var size = buckybase.assert_number(parseInt(type_and_size[1]));
    buckybase.assert(!isNaN(size));
    var data = bin.subarray(ix + 1);
    buckybase.assert(data.length === size);
    switch(type) {
    case buckybase.BLOB_TYPE: return buckybase.blob_from_git_uint8array(data);
    case buckybase.TREE_TYPE: return buckybase.tree_from_git_uint8array(data);
    case buckybase.COMMIT_TYPE: return buckybase.commit_from_git_uint8array(data);
    default: buckybase.error("Unknown object type: " + type);
    }
}

buckybase.blob_from_git_uint8array = function(bin) {
    buckybase.assert_type(bin, Uint8Array);
    return buckybase.make_blob(bin);
}

buckybase.tree_from_git_uint8array = function(bin) {
    buckybase.assert_type(bin, Uint8Array);
    var tree = buckybase.make_tree();
    var off = 0;
    while(off < bin.length) {
        off += buckybase.add_tree_entry_from_git_uint8array(tree, bin.subarray(off));
    }
    return tree;
}

buckybase.add_tree_entry_from_git_uint8array = function(tree, bin) {
    buckybase.assert_type(tree, buckybase.Tree);
    buckybase.assert_type(bin, Uint8Array);
    var ix = buckybase.binary_index_of(bin, 0);
    if (ix === -1) {
        buckybase.error("Tree entry doesn't have NUL byte, probably ill-formatted Git data: " + bin);
    }
    var prefix = buckybase.string_from_uint8array(bin.subarray(0, ix));
    var mode_and_name = prefix.split(" ");
    if (mode_and_name.length !== 2) {
        buckybase.error("Tree entry prefix doesn't consist of name and mode: " + prefix);
    }
    var mode = mode_and_name[0];
    var name = mode_and_name[1];
    var type = buckybase.type_from_mode(mode);
    var hash_off = ix + 1;
    var total_len = hash_off + buckybase.HASH_LENGTH;
    var hash = buckybase.make_hash(bin.subarray(hash_off, total_len));
    buckybase.tree_put(tree, buckybase.utf8_encode(name), buckybase.internal_make_tree_entry(hash, type));
    return total_len;
}

buckybase.commit_from_git_uint8array = function(bin) {
    buckybase.assert_type(bin, Uint8Array);
    var tree_hash, parent_hashes = [], author, committer, message;
    var ops = Object.create(null);
    ops[buckybase.COMMIT_TREE] = function(s) {
        tree_hash = buckybase.make_hash(buckybase.hex_string_to_uint8array(s));
    };
    ops[buckybase.COMMIT_PARENT] = function(s) {
        parent_hashes.push(buckybase.make_hash(buckybase.hex_string_to_uint8array(s)));
    };
    ops[buckybase.COMMIT_AUTHOR] = function(s) {
        author = buckybase.committer_from_string(s);
    };
    ops[buckybase.COMMIT_COMMITTER] = function(s) {
        committer = buckybase.committer_from_string(s);
    };
    var lines = buckybase.string_from_uint8array(bin).split("\n");
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (line === "") {
            message = buckybase.utf8_encode(lines.slice(i + 1).join("\n"));
            break;
        } else {
            var ix = line.indexOf(" ");
            var kind = line.substring(0, ix);
            var op = ops[kind];
            if (op !== undefined) {
                op(line.substring(ix + 1));
            }
        }
    }
    return buckybase.make_commit(tree_hash, parent_hashes, author, committer, message);
}

buckybase.COMMITTER_REGEXP = /^(.*)<(.*)>\s(\d+)\s(.*)$/;

buckybase.committer_from_string = function(s) {
    buckybase.assert_string(s);
    var data = s.match(buckybase.COMMITTER_REGEXP);
    if ((data === null) || (data.length !== 5)) {
        buckybase.error("Ill-formatted committer: " + s);
    }
    var name = buckybase.utf8_encode(data[1].trim());
    var email = buckybase.utf8_encode(data[2]);
    var timestamp = parseInt(data[3]);
    var timezone = buckybase.utf8_encode(data[4]);
    return buckybase.make_committer(name, email, timestamp, timezone);
}

// SHA-1

buckybase.HASH_LENGTH = 20;

buckybase.Hash = function Hash(uint8array) {
    this.array = buckybase.assert_type(uint8array, Uint8Array);
    buckybase.assert(uint8array.length === buckybase.HASH_LENGTH);
}

buckybase.make_hash = function(uint8array) {
    return new buckybase.Hash(uint8array);
}

buckybase.get_hash_array = function(hash) {
    return buckybase.assert_type(hash, buckybase.Hash).array;
}

buckybase.sha1 = function(uint8array) {
    buckybase.assert_type(uint8array, Uint8Array);
    return buckybase.make_hash(buckybase.hex_string_to_uint8array(sha1.hash(uint8array.buffer)));
}

buckybase.hex_string_to_uint8array = function(str) {
    buckybase.assert_string(str);
    buckybase.assert((str.length % 2) === 0);
    var array = new Uint8Array(str.length / 2);
    var i = 0;
    str.replace(/(..)/g, function(doublette) {
        array[i++] = parseInt(doublette, 16);
    });
    return array;
}

buckybase.uint8array_to_hex_string = function(uint8array) {
    buckybase.assert_type(uint8array, Uint8Array);
    var ret = "";
    for (var i = 0; i < uint8array.length; i++) {
        ret += (uint8array[i] < 16 ? "0" : "") + uint8array[i].toString(16);
    }
    return ret;
}

buckybase.Hash.prototype.toString = function() {
    return buckybase.uint8array_to_hex_string(this.array);
}

// UTF8 encoding / decoding

buckybase.UTF8 = function UTF8(utf8_string) {
    this.utf8_string = buckybase.assert_string(utf8_string);
}

buckybase.internal_make_utf8 = function(utf8_string) {
    return new buckybase.UTF8(utf8_string);
}

buckybase.utf8_encode = function(js_string) {
    buckybase.assert_string(js_string);
    return buckybase.internal_make_utf8(unescape(encodeURIComponent(js_string)));
}

buckybase.utf8_decode = function(utf8) {
    return decodeURIComponent(escape(buckybase.get_utf8_string(utf8)));
}

buckybase.get_utf8_string = function(utf8) {
    return buckybase.assert_type(utf8, buckybase.UTF8).utf8_string;
}

buckybase.utf8_to_uint8array = function(utf8) {
    return buckybase.string_to_uint8array(buckybase.get_utf8_string(utf8));
}

buckybase.string_to_uint8array = function(str) {
    buckybase.assert_string(str);
    return TextEncoder("utf-8").encode(str);
}

buckybase.utf8_from_uint8array = function(uint8array) {
    buckybase.assert_type(uint8array, Uint8Array);
    return buckybase.internal_make_utf8(buckybase.string_from_uint8array(uint8array));
}

buckybase.string_from_uint8array = function(uint8array) {
    buckybase.assert_type(uint8array, Uint8Array);
    return TextDecoder("utf-8").decode(uint8array);
}

// UTC

buckybase.utc_timestamp = function() {
    // BUG: broken
    var now = new Date(); 
    var now_utc = new Date(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        now.getUTCHours(),
        now.getUTCMinutes(),
        now.getUTCSeconds());
    return Math.round(now_utc.getTime() / 1000);
}

buckybase.utc_offset = function() {
    return buckybase.utf8_encode("+0000");
}

// Binary utilities

buckybase.append_uint8arrays = function(a, b) {
    buckybase.assert_type(a, Uint8Array);
    buckybase.assert_type(b, Uint8Array);
    var c = new Uint8Array(a.length + b.length);
    c.set(a);
    c.set(b, a.length);
    return c;
}

buckybase.binary_index_of = function(bin, byte) {
    buckybase.assert_type(bin, Uint8Array);
    buckybase.assert_number(byte);
    for (var i = 0; i < bin.length; i++) {
        if (bin[i] === byte) {
            return i;
        }
    }
    return -1;
}

// Sanity checking utilities

buckybase.assert = function(b) {
    if (!(b === true)) {
        buckybase.error("Assertion failed.");
    }
}

buckybase.assert_type = function(object, type) {
    if (!(object instanceof type)) {
        buckybase.error(object + " not an instance of " + type);
    }
    return object;
}

buckybase.assert_array_type = function(array, type) {
    buckybase.assert_type(array, Array);
    array.forEach(function(elt) { buckybase.assert_type(elt, type); });
    return array;
}

buckybase.is_string = function(s) {
    return typeof s === "string" || s instanceof String;
}

buckybase.assert_string = function(s) {
    if (!buckybase.is_string(s)) {
        buckybase.error("Not a string: " + s);
    }
    return s;
}

buckybase.is_number = function(n) {
    return typeof n === "number" || n instanceof Number;
}

buckybase.assert_number = function(n) {
    if (!buckybase.is_number(n)) {
        buckybase.error("Not a number: " + n);
    }
    return n;
}

// Errors

buckybase.Error = function Error(msg) {
    this.msg = msg;
}

buckybase.Error.prototype.toString = function() {
    return this.msg;
}

buckybase.error = function(msg) {
    throw new buckybase.Error(msg);
}

// Acknowledgements
//
// UTF8 encoding/decoding adapted from http://ecmanaut.blogspot.com/2006/07/encoding-decoding-utf8-in-javascript.html
//
// Hex to Uint8Array adapted from http://named-data.net/doc/0.2/ndn-js/doc/DataUtils.js.html
