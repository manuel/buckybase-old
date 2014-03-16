///// Buckybase Real-Time Communications

bbrtc = Object.create(null);

bbrtc.API_KEY = "kr3dz3x3wnuerk9";

bbrtc.ON_DATA = "data";
bbrtc.ON_CONNECTION = "connection";

bbrtc.OPTIONS = {
    key: bbrtc.API_KEY,
    reliable: true,
    debug: 3,
    logFunction: function() { console.log(Array.prototype.slice.call(arguments).join(" ")); },
    config: { "iceServers": [{url:'stun:stun01.sipphone.com'},{url:'stun:stun.ekiga.net'}, {url:'stun:stun.fwdnet.net'}, {url:'stun:stun.ideasip.com'}, {url:'stun:stun.iptel.org'}, {url:'stun:stun.rixtelecom.se'}, {url:'stun:stun.schlund.de'}, {url:'stun:stun.l.google.com:19302'}, {url:'stun:stun1.l.google.com:19302'}, {url:'stun:stun2.l.google.com:19302'}, {url:'stun:stun3.l.google.com:19302'}, {url:'stun:stun4.l.google.com:19302'}, {url:'stun:stunserver.org'}, {url:'stun:stun.softjoys.com'}, {url:'stun:stun.voiparound.com'}, {url:'stun:stun.voipbuster.com'}, {url:'stun:stun.voipstunt.com'}, {url:'stun:stun.voxgratia.org'}, {url:'stun:stun.xten.com'}, { url: 'turn:numb.viagenie.ca', credential: 'muazkh', username: 'webrtc@live.com' }, { url: 'turn:192.158.29.39:3478?transport=udp', credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=', username: '28224511:1379330808' }, { url: 'turn:192.158.29.39:3478?transport=tcp', credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=', username: '28224511:1379330808' }]
 }
};

bbrtc.make_peer = function(id) {
    bbutil.assert_string(id);
    var peer = new Peer(id, bbrtc.OPTIONS);
    return peer;
}

bbrtc.make_server_peer = function(id) {
    var peer = bbrtc.make_peer(id);
    peer.on(bbrtc.ON_CONNECTION, bbrtc.on_server_connection);
    return peer;
}

bbrtc.on_server_connection = function(conn) {
    var repo = bbcs.make_idb_repo(bbutil.utf8_encode("main"));
    bbcs.init_repo(
        function() {
            console.log("MAKING SERVER");
            bbrtc.make_rtc_repo_server(repo, conn);
        },
        function(error) {
            throw error;
        },
        repo
    );
}

//// RTC Repo Server

// Serves wrapped repo over a reliable RTC connection.
//
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

bbrtc.RTCRepoServer = function RTCRepoServer(repo, conn) {
    conn.on(bbrtc.ON_DATA, function(req) {
        console.log("SERVER DATA");
        bbutil.assert_string(req);
        if (bbutil.string_starts_with(req, bbrtc.REF_PREFIX)) {
            console.log("received ref request: " + req);
            var ref_name = req.substring(bbrtc.REF_PREFIX.length);
            var ref = bbcs.make_ref(bbutil.internal_make_utf8(ref_name));
            bbcs.repo_get_ref(
                function(hash) {
                    console.log("SEND REF RES");
                    conn.send(bbrtc.REF_PREFIX + hash.toString()); // ?
                },
                function(error) {
                    console.log("SERVER ERROR");
                    conn.send(bbrtc.ERR_PREFIX + error.toString());
                },
                repo,
                ref
            );
        } else if (bbutil.string_starts_with(req, bbrtc.OBJ_PREFIX)) {
            console.log("received object request: " + req);
            var hex = req.substring(bbrtc.OBJ_PREFIX.length);
            var hash = bbcs.make_hash(bbutil.hex_string_to_binary(hex));
            bbcs.repo_get_object_binary(
                function(bin) {
                    console.log("SEND OBJ RES");
                    conn.send(bin);
                },
                function(error) {
                    console.log("SERVER ERROR");
                    conn.send(bbrtc.ERR_PREFIX + error.toString());
                },
                repo,
                hash
            );            
        } else {
            console.log("SERVER ERROR");
            conn.send(bbrtc.ERR_PREFIX + "Malformed request:" + req);
        }
    });
}

bbrtc.make_rtc_repo_server = function(repo, conn) {
    return new bbrtc.RTCRepoServer(repo, conn);
}

bbrtc.make_rtc_client_repo = function(peer) {
    return new bbrtc.RTCClientRepo(peer);
}

bbrtc.RTCClientRepo = function RTCClientRepo(peer) {
    this.peer = peer;
    this.success = null;
    this.failure = null;
}

bbrtc.RTCClientRepo.prototype = new bbcs.Repo();

bbrtc.RTCClientRepo.prototype.init_repo = function(success, failure, repo) {
    console.log("FSCK");
    repo.peer.on("open", function(conn) {
        console.log("CLIENT CONNECTED");
        repo.peer.on(bbrtc.ON_DATA, function(data) {
            console.log("CLIENT DATA");
            if (bbutil.is_string(data) && bbutil.string_starts_with(data, bbrtc.REF_PREFIX)) {
                repo.success(bbcs.make_hash(bbutil.hex_string_to_binary(data.substring(bbrtc.REF_PREFIX.length))));
            } else if (data instanceof Uint8Array) {
                repo.success(data);
            } else if (data instanceof ArrayBuffer) {
                repo.success(new Uint8Array(data));
            } else {
                repo.failure(data);
            }
        });
        repo.peer.on(bbrtc.ON_ERROR, function(err) {
            console.log("CLIENT ERROR");
            repo.failure(err);
        });
        success(repo);
    });
}

bbrtc.RTCClientRepo.prototype.repo_get_ref = function(success, failure, repo, ref) {
    repo.success = success;
    repo.failure = failure;
    var ref_name = ref.toString(); // ?
    var req = bbrtc.REF_PREFIX + ref_name;
    console.log("SEND " + req);
    repo.peer.send(req);
}

bbrtc.RTCClientRepo.prototype.repo_get_object_binary = function(success, failure, repo, hash) {
    repo.success = success;
    repo.failure = failure;
    var hex = bbutil.binary_to_hex_string(bbcs.get_hash_array(hash));
    var req = bbrtc.OBJ_PREFIX + hex;
    console.log("SEND " + req);
    repo.peer.send(req);
}
