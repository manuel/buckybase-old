///// Buckybase File System

var bbfs = Object.create(null);

bbfs.FS = function FS(repo) {
    bbutil.assert_type(repo, bbcs.Repo);
}

bbfs.get_node = function(fs) {
    bbutil.assert_type(fs, bbfs.FS);
    
}

bbfs.put_node = function(fs) {
    
}
