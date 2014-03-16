///// Buckybase Real-Time Communications

bbrtc = Object.create(null);

bbrtc.API_KEY = "kr3dz3x3wnuerk9";

bbrtc.ON_PEER_OPEN = "open";
bbrtc.ON_PEER_CONN = "connection";
bbrtc.ON_PEER_CLOSE = "close";
bbrtc.ON_PEER_ERROR = "error";

bbrtc.ON_CONN_OPEN = "open";
bbrtc.ON_CONN_DATA = "data";
bbrtc.ON_CONN_CLOSE = "close";
bbrtc.ON_CONN_ERROR = "error";

bbrtc.OPTIONS = {
    key: bbrtc.API_KEY,
    reliable: true,
    debug: 2,
    config: {
        "iceServers": [
            { url: "stun:stun.l.google.com:19302" },
            { url: "stun:stun1.l.google.com:19302" },
            { url: "stun:stun2.l.google.com:19302" },
            { url: "stun:stun3.l.google.com:19302" },
            { url: "stun:stun4.l.google.com:19302" },
            { url: "stun:stun.schlund.de" }
        ]
    },
    logFunction: function() { console.log(Array.prototype.slice.call(arguments).join(" ")); }
};

//// Local Base

bbrtc.LocalBase = function LocalBase(id, repo) {
    this.id = bbutil.assert_type(id, bbutil.UTF8);
    this.repo = bbutil.assert_type(repo, bbcs.Repo);
    this.peer = null;
    bbrtc.local_base_init_peer(this);
}

bbrtc.make_local_base = function(id, repo) {
    return new bbrtc.LocalBase(id, repo);
}

bbrtc.local_base_init_peer = function(base) {
    bbutil.assert_type(base, bbrtc.LocalBase);
    console.log("Creating local peer: " + base.id);
    base.peer = new Peer(bbutil.get_utf8_string(base.id), bbrtc.OPTIONS);
    base.peer.on(bbrtc.ON_PEER_OPEN, function() {
        console.log("Local peer ready.");
    });
    base.peer.on(bbrtc.ON_PEER_CONN, function(conn) {
        bbrtc.init_remote_conn(base, conn);
    });
    base.peer.on(bbrtc.ON_PEER_ERROR, function(error) {
        console.log("Local peer error: " + error);
    });
    base.peer.on(bbrtc.ON_PEER_CLOSE, function() {
        console.log("Local peer closed.");
    });
}

bbrtc.init_remote_conn = function(base, conn) {
    bbutil.assert_type(base, bbrtc.LocalBase);
    //bbutil.assert_type(conn, DataConnection);
    conn.on(bbrtc.ON_CONN_OPEN, function() {
        console.log("Connection from remote peer opened: " + conn.peer);
    });
    conn.on(bbrtc.ON_CONN_DATA, function(req) {
        bbrtc.remote_conn_serve_request(base, conn, req);
    });
    conn.on(bbrtc.ON_CONN_ERROR, function(error) {
        console.log("Error on connection from remote peer " + conn.peer + ": " + error);
    });
    conn.on(bbrtc.ON_CONN_CLOSE, function() {
        console.log("Connection from remote peer closed: " + conn.peer);
    });
}

// Requests it receives are UTF8 strings, equal to IDBRepo's keys
// (e.g. "ref:refs/heads/master", or "obj:0316b39e0c53bdfa86521c4690d8e0ef5ffdb51a".
//
// Responses it sends are the "ref:" + hex UTF8 string (for refs) or Git binary data (for objects).
//
// Only fetching data is supported, not writing.
//
// Responds with null if ref or object not found.
//
// Responds with "err: error message" if an error happens.

bbrtc.REF_PREFIX = "ref:";
bbrtc.OBJ_PREFIX = "obj:";
bbrtc.ERR_PREFIX = "err:";

bbrtc.remote_conn_serve_request = function(base, conn, req) {
    bbutil.assert_type(base, bbrtc.LocalBase);
    bbutil.assert_string(req);
    if (bbutil.string_starts_with(req, bbrtc.REF_PREFIX)) {
        var ref_name = req.substring(bbrtc.REF_PREFIX.length);
        var ref = bbcs.make_ref(bbutil.internal_make_utf8(ref_name));
        bbcs.repo_get_ref(
            function(hash) {
                console.log("Sending ref " + ref_name + " (" + hash.toString() + ") to remote peer: " + conn.peer);
                conn.send(bbrtc.REF_PREFIX + hash.toString());
            },
            function(error) {
                console.log("Repo error fetching ref " + ref_name + ": " + error.toString());
                conn.send(bbrtc.ERR_PREFIX + error.toString());
            },
            base.repo,
            ref
        );
    } else if (bbutil.string_starts_with(req, bbrtc.OBJ_PREFIX)) {
        var hex = req.substring(bbrtc.OBJ_PREFIX.length);
        var hash = bbcs.make_hash(bbutil.hex_string_to_binary(hex));
        bbcs.repo_get_object_binary(
            function(bin) {
                console.log("Sending object " + hex +  " to remote peer: " + conn.peer);
                conn.send(bin);
            },
            function(error) {
                console.log("Repo error fetching object " + hex + ": " + error.toString());
                conn.send(bbrtc.ERR_PREFIX + error.toString());
            },
            base.repo,
            hash
        );
    } else {
        console.log("Malformed request `" + req + "` from remote peer: " + conn.peer);
        conn.send(bbrtc.ERR_PREFIX + "Malformed request: " + req);
    }
}

bbrtc.RemoteRepo = function RemoteRepo(base, remote_id) {
    this.base = bbutil.assert_type(base, bbrtc.LocalBase);
    this.remote_id = bbutil.assert_type(remote_id, bbutil.UTF8);
    this.conn = base.peer.connect(bbutil.get_utf8_string(remote_id));
    this.requests = [];
    bbrtc.setup_remote_repo(this);
}

bbrtc.RemoteRepo.prototype = new bbcs.Repo();

bbrtc.Request = function Request(success, failure) {
    this.success = bbutil.assert_type(success, Function);
    this.failure = bbutil.assert_type(failure, Function);
}

bbrtc.make_remote_repo = function(base, remote_id) {
    return new bbrtc.RemoteRepo(base, remote_id);
}

bbrtc.setup_remote_repo = function(repo) {
    bbutil.assert_type(repo, bbrtc.RemoteRepo);
    repo.conn.on(bbrtc.ON_CONN_OPEN, function() {
        console.log("Connection to remote peer opened: " + repo.remote_id);
    });
    repo.conn.on(bbrtc.ON_CONN_DATA, function(data) {
        bbrtc.remote_repo_handle_data(repo, data);
    });
    repo.conn.on(bbrtc.ON_CONN_CLOSE, function() {
        console.log("Connection to remote peer closed: " + repo.remote_id);
    });
    repo.conn.on(bbrtc.ON_CONN_ERROR, function(error) {
        console.log("Error on connection to remote peer " + repo.remote_id + ": " + error);
        repo.requests = [];
            repo.conn.close();
    });
}

bbrtc.remote_repo_handle_data = function(repo, data) {
    bbutil.assert(repo.requests.length > 0);
    var req = repo.requests[0];
    repo.requests = repo.requests.unshift();
    if (bbutil.is_string(data) && bbutil.string_starts_with(data, bbrtc.REF_PREFIX)) {
        req.success(bbcs.make_hash(bbutil.hex_string_to_binary(data.substring(bbrtc.REF_PREFIX.length))));
    } else if (data instanceof Uint8Array) {
        req.success(data);
    } else if (data instanceof ArrayBuffer) {
        req.success(new Uint8Array(data));
    } else {
        req.failure("Received illegal data: " + data);
    }
}

bbrtc.RemoteRepo.prototype.repo_get_ref = function(success, failure, repo, ref) {
    if (repo.conn.open) {
        var req = bbrtc.REF_PREFIX + ref.toString();
        console.log("Requesting ref " + req + " from remote peer: " + repo.remote_id);
        repo.requests.push(new bbrtc.Request(success, failure));
        repo.conn.send(req);
    } else {
        failure("Tried sending on closed connection to remote peer: " + repo.remote_id);
    }
}

bbrtc.RemoteRepo.prototype.repo_get_object_binary = function(success, failure, repo, hash) {
    if (repo.conn.open) {
        var req = bbrtc.OBJ_PREFIX + bbutil.binary_to_hex_string(bbcs.get_hash_array(hash));
        console.log("Requesting object " + req + " from remote peer: " + repo.remote_id);
        repo.requests.push(new bbrtc.Request(success, failure));
        repo.conn.send(req);
    } else {
        failure("Tried sending on closed connection to remote peer: " + repo.remote_id);
    }
}
