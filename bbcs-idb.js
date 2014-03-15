///// Buckybase Content Store IndexedDB Repository

bbcs.MASTER = bbutil.utf8_encode("refs/heads/master");

//// Repository Interface

bbcs.Repo = function Repo() {
}

bbcs.init_repo = function(success, failure, repo) {
    bbutil.assert_type(repo, bbcs.Repo);
    return repo.init_repo(success, failure, repo);
}

bbcs.repo_get_ref = function(success, failure, repo, ref) {
    bbutil.assert_type(repo, bbcs.Repo);
    bbutil.assert_type(ref, bbutil.UTF8);
    return repo.repo_get_ref(success, failure, repo, ref);
}

//// IndexedDB Repo Implementation

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
    var key = bbcs.ref_idb_key_string(ref);
    repo.store.get(key, success, failure);
}

/// Utilities

bbcs.ref_idb_key_string = function(ref) {
    bbutil.assert_type(ref, bbutil.UTF8);
    return "ref:" + bbutil.get_utf8_string(ref);
}
