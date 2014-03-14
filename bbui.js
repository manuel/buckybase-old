var bbui = Object.create(null);

bbui.REF_PREFIX = "ref:";
bbui.HEAD = bbui.REF_PREFIX + "HEAD";

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
            console.log("Current HEAD: " + head);
            if (!buckybase.is_string(head)) {
                bbui.init_head(store);
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
        new Date().getUTCSeconds(),
        buckybase.utf8_encode("+0000"));
    return buckybase.make_commit(tree_hash, parent_hashes, committer, committer, buckybase.utf8_encode(""));
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
        },
        bbui.init_failure_handler);
}

