///// Buckybase Content Store Data Model and Git Format

var bbcs = Object.create(null);

//// Data Model

bbcs.TREE_TYPE = "tree";
bbcs.BLOB_TYPE = "blob";
bbcs.COMMIT_TYPE = "commit";

bbcs.TREE_MODE = "40000";
bbcs.BLOB_MODE = "100644";

bbcs.COMMIT_TREE = "tree";
bbcs.COMMIT_PARENT = "parent";
bbcs.COMMIT_AUTHOR = "author";
bbcs.COMMIT_COMMITTER = "committer";

bbcs.Object = function Object() {
}

/// Blob

bbcs.Blob = function Blob(binary) {
    this.binary = bbutil.assert_type(binary, Uint8Array);
}

bbcs.Blob.prototype = new bbcs.Object();

bbcs.make_blob = function(binary) {
    return new bbcs.Blob(binary);
}

bbcs.get_blob_binary = function(blob) {
    return bbutil.assert_type(blob, bbcs.Blob).binary;
}

bbcs.blob_size = function(blob) {
    return bbutil.assert_type(blob, bbcs.Blob).binary.length;
}

/// Tree

bbcs.Tree = function Tree() {
    this.entries = Object.create(null);
}

bbcs.Tree.prototype = new bbcs.Object();

bbcs.make_tree = function() {
    return new bbcs.Tree();
}

bbcs.tree_put = function(tree, name, entry) {
    bbutil.assert_type(tree, bbcs.Tree);
    bbutil.assert_type(name, bbutil.UTF8);
    bbutil.assert_type(entry, bbcs.TreeEntry);
    var utf8_string = bbutil.get_utf8_string(name);
    bbutil.assert(utf8_string.indexOf("\0") === -1);
    tree.entries[utf8_string] = entry;
}

bbcs.tree_get = function(tree, name) {
    bbutil.assert_type(tree, bbcs.Tree);
    bbutil.assert_type(name, bbutil.UTF8);
    return tree.entries[bbutil.get_utf8_string(name)];
}

bbcs.tree_names = function(tree) {
    bbutil.assert_type(tree, bbcs.Tree);
    return Object.keys(tree.entries).sort().map(bbutil.internal_make_utf8);
}

/// Tree Entry

bbcs.TreeEntry = function TreeEntry(hash, type) {
    this.hash = bbutil.assert_type(hash, bbcs.Hash);
    this.type = bbcs.assert_tree_entry_type(type);
}

bbcs.internal_make_tree_entry = function(hash, type) {
    return new bbcs.TreeEntry(hash, type);
}

bbcs.make_tree_entry_for_blob = function(hash) {
    return bbcs.internal_make_tree_entry(hash, bbcs.BLOB_TYPE);
}

bbcs.make_tree_entry_for_tree = function(hash) {
    return bbcs.internal_make_tree_entry(hash, bbcs.TREE_TYPE);
}

bbcs.get_tree_entry_hash = function(entry) {
    return bbutil.assert_type(entry, bbcs.TreeEntry).hash;
}

bbcs.get_tree_entry_type = function(entry) {
    return bbutil.assert_type(entry, bbcs.TreeEntry).type;
}

bbcs.assert_tree_entry_type = function(type) {
    bbutil.assert((type === bbcs.TREE_TYPE) || (type === bbcs.BLOB_TYPE));
    return type;
}

bbcs.tree_entry_mode = function(entry) {
    return bbcs.mode_from_type(bbcs.get_tree_entry_type(entry));
}

bbcs.mode_from_type = function(type) {
    bbutil.assert_string(type);
    switch(type) {
    case bbcs.BLOB_TYPE: return bbcs.BLOB_MODE;
    case bbcs.TREE_TYPE: return bbcs.TREE_MODE;
    default: bbutil.error("Unknown type: " + type);
    }
}

bbcs.type_from_mode = function(mode) {
    bbutil.assert_string(mode);
    switch(mode) {
    case bbcs.BLOB_MODE: return bbcs.BLOB_TYPE;
    case bbcs.TREE_MODE: return bbcs.TREE_TYPE;
    default: bbutil.error("Unknown mode: " + mode);
    }
}

/// Commit

bbcs.Commit = function Commit(tree_hash, parent_hashes, author, committer, message) {
    this.tree_hash = bbutil.assert_type(tree_hash, bbcs.Hash);
    this.parent_hashes = bbutil.assert_array_type(parent_hashes, bbcs.Hash);
    this.author = bbutil.assert_type(author, bbcs.Committer);
    this.committer = bbutil.assert_type(committer, bbcs.Committer);
    this.message = bbutil.assert_type(message, bbutil.UTF8);
}

bbcs.Commit.prototype = new bbcs.Object();

bbcs.Committer = function Committer(name, email, timestamp, timezone) {
    this.name = bbutil.assert_type(name, bbutil.UTF8);
    this.email = bbutil.assert_type(email, bbutil.UTF8);
    this.timestamp = bbutil.assert_number(timestamp);
    this.timezone = bbutil.assert_type(timezone, bbutil.UTF8);
}

bbcs.make_commit = function(tree_hash, parent_hashes, author, committer, message) {
    return new bbcs.Commit(tree_hash, parent_hashes, author, committer, message);
}

bbcs.make_committer = function(name, email, timestamp, timezone) {
    return new bbcs.Committer(name, email, timestamp, timezone);
}

bbcs.get_commit_tree = function(commit) {
    return bbutil.assert_type(commit, bbcs.Commit).tree_hash;
}

bbcs.get_commit_parents = function(commit) {
    return bbutil.assert_type(commit, bbcs.Commit).parent_hashes;
}

bbcs.Commit.prototype.toString = function() {
    var parents = this.parent_hashes.map(function(ph) { return bbcs.COMMIT_PARENT + " " + ph.toString() }).join("\n");
    return bbcs.COMMIT_TREE + " " + this.tree_hash.toString() + "\n"
        + (parents === "" ? "" : parents + "\n")
        + bbcs.COMMIT_AUTHOR + " " + this.author.toString() + "\n"
        + bbcs.COMMIT_COMMITTER + " " + this.committer.toString() + "\n"
        + "\n"
        + bbutil.get_utf8_string(this.message);
}

bbcs.Committer.prototype.toString = function() {
    return bbutil.get_utf8_string(this.name) + 
        " <" + bbutil.get_utf8_string(this.email) + "> "
        + this.timestamp + " " 
        + bbutil.get_utf8_string(this.timezone);
}

//// Git Format

/// Writing

bbcs.GitData = function GitData(hash, binary) {
    this.hash = bbutil.assert_type(hash, bbcs.Hash);
    this.binary = bbutil.assert_type(binary, Uint8Array);
}

bbcs.make_git_data = function(hash, binary) {
    return new bbcs.GitData(hash, binary);
}

bbcs.get_git_data_hash = function(data) {
    return bbutil.assert_type(data, bbcs.GitData).hash;
}

bbcs.get_git_data_binary = function(data) {
    return bbutil.assert_type(data, bbcs.GitData).binary;
}

bbcs.object_to_git_data = function(obj) {
    bbutil.assert_type(obj, bbcs.Object);
    return obj.object_to_git_data();
}

bbcs.Blob.prototype.object_to_git_data = function() {
    return bbcs.blob_to_git_data(this);
}

bbcs.Tree.prototype.object_to_git_data = function() {
    return bbcs.tree_to_git_data(this);
}

bbcs.Commit.prototype.object_to_git_data = function() {
    return bbcs.commit_to_git_data(this);
}

bbcs.blob_to_git_data = function(blob) {
    bbutil.assert_type(blob, bbcs.Blob);
    var prefix = bbutil.utf8_encode(bbcs.BLOB_TYPE + " " + bbcs.blob_size(blob) + "\0");
    var prefix_array = bbutil.utf8_to_binary(prefix);
    var array = bbutil.append_binaries(prefix_array, bbcs.get_blob_binary(blob));
    var hash = bbcs.sha1(array);
    return bbcs.make_git_data(hash, array);
}

bbcs.tree_to_git_data = function(tree) {
    bbutil.assert_type(tree, bbcs.Tree);
    var binary = new Uint8Array(0);
    bbcs.tree_names(tree).forEach(function(name) {
        var entry = bbcs.tree_get(tree, name);
        binary = bbutil.append_binaries(binary, bbcs.tree_entry_to_git_binary(name, entry));
    });
    var prefix = bbutil.utf8_encode(bbcs.TREE_TYPE + " " + binary.length + "\0");
    var prefix_array = bbutil.utf8_to_binary(prefix);
    var array = bbutil.append_binaries(prefix_array, binary);
    var hash = bbcs.sha1(array);
    return bbcs.make_git_data(hash, array);
}

bbcs.tree_entry_to_git_binary = function(name, entry) {
    bbutil.assert_type(name, bbutil.UTF8);
    bbutil.assert_type(entry, bbcs.TreeEntry);
    var mode = bbcs.tree_entry_mode(entry);
    var prefix = bbutil.utf8_encode(mode + " " + bbutil.get_utf8_string(name) + "\0");
    var prefix_array = bbutil.utf8_to_binary(prefix);
    var hash_array = bbcs.get_hash_array(bbcs.get_tree_entry_hash(entry));
    return bbutil.append_binaries(prefix_array, hash_array);
}

bbcs.commit_to_git_data = function(commit) {
    bbutil.assert_type(commit, bbcs.Commit);
    var binary = new Uint8Array(0);
    function add_utf8(s) {
        binary = bbutil.append_binaries(binary, bbutil.utf8_to_binary(s));
    }

    add_utf8(bbutil.utf8_encode(bbcs.COMMIT_TREE + " " + commit.tree_hash.toString() + "\n"));
    commit.parent_hashes.forEach(function(parent_hash) {
        add_utf8(bbutil.utf8_encode(bbcs.COMMIT_PARENT + " " + parent_hash.toString() + "\n"));
    });
    add_utf8(bbutil.utf8_encode(bbcs.COMMIT_AUTHOR + " " + commit.author.toString() + "\n"));
    add_utf8(bbutil.utf8_encode(bbcs.COMMIT_COMMITTER + " " + commit.committer.toString() + "\n"));
    add_utf8(bbutil.utf8_encode("\n"));
    add_utf8(commit.message);

    var prefix = bbutil.utf8_encode(bbcs.COMMIT_TYPE + " " + binary.length + "\0");
    var prefix_array = bbutil.utf8_to_binary(prefix);
    var array = bbutil.append_binaries(prefix_array, binary);
    var hash = bbcs.sha1(array);
    return bbcs.make_git_data(hash, array);
}

/// Reading

bbcs.object_from_git_binary = function(bin) {
    bbutil.assert_type(bin, Uint8Array);
    var ix = bbutil.binary_index_of(bin, 0);
    if (ix === -1) {
        bbutil.error("Doesn't contain NUL byte, probably ill-formatted Git data: " + bin);
    }
    var prefix = bbutil.string_from_binary(bin.subarray(0, ix));
    var type_and_size = prefix.split(" ");
    if (type_and_size.length !== 2) {
        bbutil.error("Git data prefix doesn't consist of type and size: " + prefix);
    }
    var type = type_and_size[0];
    var size = bbutil.assert_number(parseInt(type_and_size[1]));
    bbutil.assert(!isNaN(size));
    var binary = bin.subarray(ix + 1);
    bbutil.assert(binary.length === size);
    switch(type) {
    case bbcs.BLOB_TYPE: return bbcs.blob_from_git_binary(binary);
    case bbcs.TREE_TYPE: return bbcs.tree_from_git_binary(binary);
    case bbcs.COMMIT_TYPE: return bbcs.commit_from_git_binary(binary);
    default: bbutil.error("Unknown object type: " + type);
    }
}

bbcs.blob_from_git_binary = function(bin) {
    bbutil.assert_type(bin, Uint8Array);
    return bbcs.make_blob(bin);
}

bbcs.tree_from_git_binary = function(bin) {
    bbutil.assert_type(bin, Uint8Array);
    var tree = bbcs.make_tree();
    var off = 0;
    while(off < bin.length) {
        off += bbcs.add_tree_entry_from_git_binary(tree, bin.subarray(off));
    }
    return tree;
}

bbcs.add_tree_entry_from_git_binary = function(tree, bin) {
    bbutil.assert_type(tree, bbcs.Tree);
    bbutil.assert_type(bin, Uint8Array);
    var ix = bbutil.binary_index_of(bin, 0);
    if (ix === -1) {
        bbutil.error("Tree entry doesn't have NUL byte, probably ill-formatted Git data: " + bin);
    }
    var prefix = bbutil.string_from_binary(bin.subarray(0, ix));
    var mode_and_name = prefix.split(" ");
    if (mode_and_name.length !== 2) {
        bbutil.error("Tree entry prefix doesn't consist of name and mode: " + prefix);
    }
    var mode = mode_and_name[0];
    var name = mode_and_name[1];
    var type = bbcs.type_from_mode(mode);
    var hash_off = ix + 1;
    var total_len = hash_off + bbcs.HASH_LENGTH;
    var hash = bbcs.make_hash(bin.subarray(hash_off, total_len));
    bbcs.tree_put(tree, bbutil.utf8_encode(name), bbcs.internal_make_tree_entry(hash, type));
    return total_len;
}

bbcs.commit_from_git_binary = function(bin) {
    bbutil.assert_type(bin, Uint8Array);
    var tree_hash, parent_hashes = [], author, committer, message;
    var ops = Object.create(null);
    ops[bbcs.COMMIT_TREE] = function(s) {
        tree_hash = bbcs.make_hash(bbutil.hex_string_to_binary(s));
    };
    ops[bbcs.COMMIT_PARENT] = function(s) {
        parent_hashes.push(bbcs.make_hash(bbutil.hex_string_to_binary(s)));
    };
    ops[bbcs.COMMIT_AUTHOR] = function(s) {
        author = bbcs.committer_from_string(s);
    };
    ops[bbcs.COMMIT_COMMITTER] = function(s) {
        committer = bbcs.committer_from_string(s);
    };
    var lines = bbutil.string_from_binary(bin).split("\n");
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (line === "") {
            message = bbutil.utf8_encode(lines.slice(i + 1).join("\n"));
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
    return bbcs.make_commit(tree_hash, parent_hashes, author, committer, message);
}

bbcs.COMMITTER_REGEXP = /^(.*)<(.*)>\s(\d+)\s(.*)$/;

bbcs.committer_from_string = function(s) {
    bbutil.assert_string(s);
    var data = s.match(bbcs.COMMITTER_REGEXP);
    if ((data === null) || (data.length !== 5)) {
        bbutil.error("Ill-formatted committer: " + s);
    }
    var name = bbutil.utf8_encode(data[1].trim());
    var email = bbutil.utf8_encode(data[2]);
    var timestamp = parseInt(data[3]);
    var timezone = bbutil.utf8_encode(data[4]);
    return bbcs.make_committer(name, email, timestamp, timezone);
}

/// SHA-1

bbcs.HASH_LENGTH = 20;

bbcs.Hash = function Hash(binary) {
    this.array = bbutil.assert_type(binary, Uint8Array);
    bbutil.assert(binary.length === bbcs.HASH_LENGTH);
}

bbcs.make_hash = function(binary) {
    return new bbcs.Hash(binary);
}

bbcs.get_hash_array = function(hash) {
    return bbutil.assert_type(hash, bbcs.Hash).array;
}

bbcs.sha1 = function(binary) {
    bbutil.assert_type(binary, Uint8Array);
    return bbcs.make_hash(bbutil.hex_string_to_binary(sha1.hash(binary.buffer)));
}

bbcs.Hash.prototype.toString = function() {
    return bbutil.binary_to_hex_string(this.array);
}

/// UTC

bbcs.utc_timestamp = function() {
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

bbcs.utc_offset = function() {
    return bbutil.utf8_encode("+0000");
}
