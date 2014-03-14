var bbui = Object.create(null);

bbui.REF_PREFIX = "ref:";
bbui.HEAD = bbui.REF_PREFIX + "refs/heads/master";

bbui.store = null;

bbui.init_failure_handler = function(e) {
    // If any failure happens during store initialization, clear store
    bbui.store = null;
}

bbui.on_load = function() {
    bbui.store = bbui.make_store(
        function() {
            bbui.init_store(bbui.store);
        },
        bbui.init_failure_handler);
}

bbui.make_store = function(on_success, on_error) {
    return new IDBStore({
        dbVersion: 1,
        storePrefix: "buckybase-",
        storeName: "main",
        keyPath: null,
        onStoreReady: on_success,
        onError: on_error
    });
}

bbui.init_store = function(store) {
    console.log("Initing store");
    store.get(
        bbui.HEAD,
        function(head) {
            if (!buckybase.is_string(head)) {
                bbui.init_head(store);
            } else {
                bbui.init_done(store);
            }
        },
        bbui.init_failure_handler);
}

bbui.object_key = function(hex_string) {
    buckybase.assert_string(hex_string);
    return "obj:" + hex_string;
}

bbui.make_commit = function(tree_hash, parent_hashes) {
    var committer = buckybase.make_committer(
        buckybase.utf8_encode("Buckybase"),
        buckybase.utf8_encode("support@buckybase.org"),
        buckybase.utc_timestamp(),
        buckybase.utc_offset());
    return buckybase.make_commit(tree_hash, parent_hashes, committer, committer, buckybase.utf8_encode("automated commit"));
}

bbui.init_head = function(store) {
    console.log("Initing HEAD");
    var tree_data = buckybase.object_to_git_data(buckybase.make_tree());
    var commit_data = buckybase.object_to_git_data(bbui.make_commit(tree_data.hash, []));
    var head = commit_data.hash.toString();
    store.batch(
        [{ type: "put", key: bbui.object_key(tree_data.hash.toString()), value: tree_data.data },
         { type: "put", key: bbui.object_key(commit_data.hash.toString()), value: commit_data.data },
         { type: "put", key: bbui.HEAD, value: head }],
        function() {
            console.log("Inited HEAD: " + head);
            bbui.init_done(store);
        },
        bbui.init_failure_handler);
}

bbui.init_done = function(store) {
    console.log("Loading data");
    store.get(
        bbui.HEAD,
        function(head) {
            buckybase.assert_string(head);
            bbui.load_commit(store, head);
        });
}

bbui.load_commit = function(store, hex_string) {
    console.log("Loading commit: " + hex_string);
    store.get(
        bbui.object_key(hex_string),
        function(data) {
            buckybase.assert_type(data, Uint8Array);
            var commit = buckybase.object_from_git_uint8array(data);
            buckybase.assert_type(commit, buckybase.Commit);
            console.log(commit.toString());
            bbui.load_tree(store, commit.tree_hash.toString());
        });
}

bbui.load_tree = function(store, hex_string) {
    console.log("Loading tree: " + hex_string);
    store.get(
        bbui.object_key(hex_string),
        function(data) {
            buckybase.assert_type(data, Uint8Array);
            var tree = buckybase.object_from_git_uint8array(data);
            buckybase.assert_type(tree, buckybase.Tree);
            var top_entry = buckybase.tree_get(tree, buckybase.utf8_encode("top"));
            if (top_entry !== undefined) {
                bbui.load_top(store, buckybase.get_tree_entry_hash(top_entry).toString());
            }
        });
}

bbui.load_top = function(store, hex_string) {
}

bbui.add_todo_item = function(store, contents) {
    buckybase.assert_type(store, IDBStore);
    buckybase.assert_string(contents);
    
}

// A map of UTF8->UTF8 strings.

bbui.Entry = function Entry(members) {
    this.members = members;
}

bbui.make_entry = function() {
    return new bbui.Entry(Object.create(null));
}

bbui.entry_put = function(entry, key, value) {
    buckybase.assert_type(entry, bbui.Entry);
    buckybase.assert_type(key, buckybase.UTF8);
    buckybase.assert_type(value, buckybase.UTF8);
    entry.members[buckybase.get_utf8_string(key)] = buckybase.get_utf8_string(value);
}

buckybase.entry_get = function(entry, key) {
    buckybase.assert_type(entry, buckybase.Entry);
    buckybase.assert_type(key, buckybase.UTF8);
    return buckybase.internal_make_utf8(entry.members[buckybase.get_utf8_string(key)]);
}

buckybase.entry_names = function(entry) {
    buckybase.assert_type(entry, buckybase.Entry);
    return Object.keys(entry.members).sort().map(buckybase.internal_make_utf8);
}

bbui.entry_to_json_utf8 = function(entry) {
    buckybase.assert_type(entry, bbui.Entry);
    return buckybase.internal_make_utf8(JSON.stringify(entry));
}

bbui.entry_from_json_utf8 = function(utf8) {
    buckybase.assert_type(utf8, buckybase.UTF8);
    var json_object = JSON.parse(buckybase.get_utf8_string(s));
    return new bbui.Entry(json_object.members);
}

