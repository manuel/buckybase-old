///// Buckybase Content Store IndexedDB Repository

//// Repository Interface

bbcs.Ref = function Ref(label) {
    this.label = bbutil.assert_type(label, bbutil.UTF8);
}

bbcs.make_ref = function(label) {
    return new bbcs.Ref(label);
}

bbcs.Ref.prototype.toString = function() {
    return bbutil.get_utf8_string(this.label);
}

bbcs.MASTER = bbcs.make_ref(bbutil.utf8_encode("refs/heads/master"));

bbcs.Repo = function Repo() {
}

bbcs.init_repo = function(success, failure, repo) {
    bbutil.assert_type(repo, bbcs.Repo);
    return repo.init_repo(success, failure, repo);
}

bbcs.repo_get_ref = function(success, failure, repo, ref) {
    bbutil.assert_type(repo, bbcs.Repo);
    bbutil.assert_type(ref, bbcs.Ref);
    return repo.repo_get_ref(success, failure, repo, ref);
}

bbcs.repo_put_ref = function(success, failure, repo, ref, hash) {
    bbutil.assert_type(repo, bbcs.Repo);
    bbutil.assert_type(ref, bbcs.Ref);
    bbutil.assert_type(hash, bbcs.Hash);
    return repo.repo_put_ref(success, failure, repo, ref, hash);
}

bbcs.repo_get_object_binary = function(success, failure, repo, hash) {
    bbutil.assert_type(repo, bbcs.Repo);
    bbutil.assert_type(hash, bbcs.Hash);
    return repo.repo_get_object_binary(success, failure, repo, hash);
}

bbcs.repo_put_object_binary = function(success, failure, repo, hash, binary) {
    bbutil.assert_type(repo, bbcs.Repo);
    bbutil.assert_type(hash, bbcs.Hash);
    bbutil.assert_type(binary, Uint8Array);
    return repo.repo_put_object_binary(success, failure, repo, hash, binary);
}

bbcs.repo_get_object = function(success, failure, repo, hash) {
    bbcs.repo_get_object_binary(
        function(binary) {
            if (binary instanceof Uint8Array) {
                success(bbcs.object_from_git_binary(binary));
            } else {
                success(null);
            }
        },
        failure,
        repo,
        hash
    );
}

//// IndexedDB Repo Implementation

// For an object, the key is a string "obj:" + hex_hash, and the data is a Uint8Array.
//
// For a ref, the key is a string "ref:" + ref_name, and the data is a hex string hash.

bbcs.IDBRepo = function IDBRepo(name) {
    this.name = bbutil.assert_type(name, bbutil.UTF8);
    this.store = null;
}

bbcs.IDBRepo.prototype = new bbcs.Repo();

bbcs.make_idb_repo = function(name) {
    return new bbcs.IDBRepo(name);
}

bbcs.IDBRepo.prototype.init_repo = function(success, failure, repo) {
    bbutil.assert(repo.store === null);
    repo.store = new IDBStore({
        dbVersion: 1,
        storePrefix: "buckybase-",
        storeName: bbutil.get_utf8_string(repo.name),
        keyPath: null,
        onStoreReady: function() { success(repo); },
        onError: failure
    });
}

bbcs.IDBRepo.prototype.repo_get_ref = function(success, failure, repo, ref) {
    var key = bbcs.idb_ref_key_string(ref);
    repo.store.get(
        key,
        function(hex) {
            if (bbutil.is_string(hex)) {
                success(bbcs.make_hash(bbutil.hex_string_to_binary(hex)));
            } else {
                success(null);
            }
        },
        failure
    );
}

bbcs.IDBRepo.prototype.repo_put_ref = function(success, failure, repo, ref, hash) {
    var key = bbcs.idb_ref_key_string(ref);
    var value = bbutil.binary_to_hex_string(bbcs.get_hash_array(hash));
    repo.store.put(key, value, bbcs.idb_transform_success_callback(success), failure);
}

bbcs.IDBRepo.prototype.repo_get_object_binary = function(success, failure, repo, hash) {
    var key = bbcs.idb_object_key_string(hash);
    repo.store.get(key, bbcs.idb_transform_success_callback(success), failure);
}

bbcs.IDBRepo.prototype.repo_put_object_binary = function(success, failure, repo, hash, binary) {
    var key = bbcs.idb_object_key_string(hash);
    var value = bbutil.assert_type(binary, Uint8Array);
    repo.store.put(key, value, bbcs.idb_transform_success_callback(success), failure);
}

/// Utilities

bbcs.idb_transform_success_callback = function(success) {
    return function(result) {
        success(result === undefined ? null : result);
    }
}

bbcs.idb_ref_key_string = function(ref) {
    bbutil.assert_type(ref, bbcs.Ref);
    return "ref:" + bbutil.get_utf8_string(ref.label);
}

bbcs.idb_object_key_string = function(hash) {
    bbutil.assert_type(hash, bbcs.Hash);
    return "obj:" + bbutil.binary_to_hex_string(bbcs.get_hash_array(hash));
}
