function assert_true(x, msg) {
    if (!(x === true)) {
        throw "Assertion failed.";
    }
}

function assert_equals(a, b) {
    if (!(a === b)) {
        throw "Not equal: " + a + ", " + b;
    }
}

function assert_throws(fun) {
    try {
        fun();
    } catch(e) {
        return;
    }
    throw "Expected to throw, but didn't.";
}

assert_true(bbutil.is_string("foo"));
assert_true(bbutil.is_string(new String("foo")));
assert_true(bbutil.is_string(String("foo")));
assert_throws(function() { assert_string(false); });
assert_throws(function() { assert_string(null); });
assert_throws(function() { assert_string(undefined); });

assert_throws(function() { bbutil.utf8_encode(true) });
assert_throws(function() { bbutil.utf8_encode(12) });

assert_throws(function() { bbutil.utf8_decode("foo"); });
assert_throws(function() { bbutil.utf8_decode(12); });
assert_throws(function() { bbutil.utf8_decode(undefined); });

var sam = "Iñtërnâtiônàlizætiøn 同じ声優で好きなキャラ二人晒せ";
assert_equals(sam, bbutil.utf8_decode(bbutil.utf8_encode(sam)));

assert_throws(function() { assert_type("foo", bbutil.UTF8); });
assert_throws(function() { assert_type(null, bbutil.UTF8); });
assert_throws(function() { assert_type(undefined, bbutil.UTF8); });

// Content-addressed store

var hello = bbcs.make_blob(bbutil.utf8_to_uint8array(bbutil.utf8_encode("Hello world!\n")));
var hello_git_data = bbcs.object_to_git_data(hello);
var hello_hash = hello_git_data.hash;
assert_equals("cd0875583aabe89ee197ea133980a9085d08e497", hello_git_data.hash.toString());
assert_equals(bbutil.string_from_uint8array(hello_git_data.data),
              bbutil.string_from_uint8array(bbcs.object_to_git_data(bbcs.object_from_git_uint8array(bbcs.object_to_git_data(hello).data)).data));

var cheers = bbcs.make_blob(bbutil.utf8_to_uint8array(bbutil.utf8_encode("Cheers\n")));
var cheers_git_data = bbcs.object_to_git_data(cheers);
var cheers_hash = cheers_git_data.hash;
assert_equals("8910437f66f497927c18191cae7a4921a9e0255f", cheers_git_data.hash.toString());
assert_equals(bbutil.string_from_uint8array(cheers_git_data.data),
              bbutil.string_from_uint8array(bbcs.object_to_git_data(bbcs.object_from_git_uint8array(bbcs.object_to_git_data(cheers).data)).data));

var tree = bbcs.make_tree();
bbcs.tree_put(tree, bbutil.utf8_encode("hello"), bbcs.make_tree_entry_for_blob(hello_hash));
bbcs.tree_put(tree, bbutil.utf8_encode("cheers"), bbcs.make_tree_entry_for_blob(cheers_hash));
var tree_git_data = bbcs.object_to_git_data(tree);
var tree_hash = tree_git_data.hash;
assert_equals("93a3d08ded05ac01b8a0b917dd5b0ac101d52cac", tree_hash.toString());
assert_equals(bbutil.string_from_uint8array(tree_git_data.data),
              bbutil.string_from_uint8array(bbcs.object_to_git_data(bbcs.object_from_git_uint8array(bbcs.object_to_git_data(tree).data)).data));

var author = bbcs.make_committer(bbutil.utf8_encode("Manuel Simoni"),
                                      bbutil.utf8_encode("msimoni@gmail.com"),
                                      1394705305,
                                      bbutil.utf8_encode("+0100"));
var commit = bbcs.make_commit(tree_hash, [], author, author, bbutil.utf8_encode("check-in\n"));
var commit_git_data = bbcs.object_to_git_data(commit);
var commit_hash = bbcs.object_to_git_data(commit).hash;
assert_equals("fbcd28e4ad1eb56bfb2837764d245ebd9727517f", commit_hash.toString());
assert_equals(bbutil.string_from_uint8array(commit_git_data.data),
              bbutil.string_from_uint8array(bbcs.object_to_git_data(bbcs.object_from_git_uint8array(bbcs.object_to_git_data(commit).data)).data));
