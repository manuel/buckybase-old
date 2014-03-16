var bbui = Object.create(null);

bbui.repo = null;
bbui.vm = new wat.VM();

bbui.on_load = function() {
    bbui.repo = bbcs.make_idb_repo(bbutil.utf8_encode("main"));
    bbui.vm.run(

        ["begin",

         wat_basics.main,

         ["define", "*bbui-prompt*", ["quote", "*bbui-prompt*"]],

         ["define", ["bbui-synchronize", "appv"],
          ["lambda", "args",
           ["take-subcont", "*bbui-prompt*", "k",
            ["define", ["success", "result", "#rest", "#ignore"],
             ["push-prompt", "*bbui-prompt*",
              ["push-subcont", "k", "result"]]],
            ["define", ["failure", "error", "#rest", "#ignore"],
             ["push-prompt", "*bbui-prompt*",
              ["throw", "error"]]],
            ["apply", "appv",
             ["list*", ["js-callback", "success"], ["js-callback", "failure"], "args"]]]]],
         
         ["define", "bbcs-init-repo", ["bbui-synchronize", ["js-wrap", bbcs.init_repo]]],
         ["define", "bbcs-repo-get-ref", ["bbui-synchronize", ["js-wrap", bbcs.repo_get_ref]]],
         ["define", "bbcs-repo-put-ref", ["bbui-synchronize", ["js-wrap", bbcs.repo_put_ref]]],
         ["define", "bbcs-repo-get-object-binary", ["bbui-synchronize", ["js-wrap", bbcs.repo_get_object_binary]]],
         ["define", "bbcs-repo-put-object-binary", ["bbui-synchronize", ["js-wrap", bbcs.repo_put_object_binary]]],
         ["define", "bbcs-repo-get-object", ["bbui-synchronize", ["js-wrap", bbcs.repo_get_object]]],

         ["define", "bbcs-make-blob", ["js-wrap", bbcs.make_blob]],
         ["define", "bbcs-make-tree", ["js-wrap", bbcs.make_tree]],
         ["define", "bbcs-tree-put", ["js-wrap", bbcs.tree_put]],
         ["define", "bbcs-tree-get", ["js-wrap", bbcs.tree_get]],
         ["define", "bbcs-tree-names", ["js-wrap", bbcs.tree_names]],
         ["define", "bbcs-make-tree-entry-for-blob", ["js-wrap", bbcs.make_tree_entry_for_blob]],
         ["define", "bbcs-make-tree-entry-for-tree", ["js-wrap", bbcs.make_tree_entry_for_tree]],
         ["define", "bbcs-get-tree-entry-hash", ["js-wrap", bbcs.get_tree_entry_hash]],
         ["define", "bbcs-make-committer", ["js-wrap", bbcs.make_committer]],
         ["define", "bbcs-make-commit", ["js-wrap", bbcs.make_commit]],
         ["define", "bbcs-get-commit-tree", ["js-wrap", bbcs.get_commit_tree]],
         ["define", "bbcs-get-commit-parents", ["js-wrap", bbcs.get_commit_parents]],
         ["define", "bbcs-object-to-git-data", ["js-wrap", bbcs.object_to_git_data]],
         ["define", "bbcs-get-git-data-hash", ["js-wrap", bbcs.get_git_data_hash]],
         ["define", "bbcs-get-git-data-binary", ["js-wrap", bbcs.get_git_data_binary]],
         ["define", "bbcs-utc-timestamp", ["js-wrap", bbcs.utc_timestamp]],
         ["define", "bbcs-utc-offset", ["js-wrap", bbcs.utc_offset]],

         ["define", "bbutil-utf8-encode", ["js-wrap", bbutil.utf8_encode]],
         ["define", "bbutil-utf8-to-binary", ["js-wrap", bbutil.utf8_to_binary]],
         ["define", "bbutil-utf8-from-binary", ["js-wrap", bbutil.utf8_from_binary]],

         ["define", ["bbui-log", "msg"],
          ["#", "log", console, "msg"]],

         ["define", ["bbui-make-committer"],
          ["bbcs-make-committer",
           ["bbutil-utf8-encode", ["string", "Buckybase"]],
           ["bbutil-utf8-encode", ["string", "support@buckybase.org"]],
           ["bbcs-utc-timestamp"],
           ["bbcs-utc-offset"]]],

         ["define", ["bbui-make-commit", "tree-hash", "parent-hashes"],
          ["let", [["committer", ["bbui-make-committer"]]],
           ["bbcs-make-commit", "tree-hash", "parent-hashes", "committer", "committer",
            ["bbutil-utf8-encode", ["string", "automated commit"]]]]],

         ["define", ["bbui-init-master", "repo"],
          ["let*", [["empty-tree", ["bbcs-make-tree"]],
                    ["empty-tree-data", ["bbcs-object-to-git-data", "empty-tree"]],
                    ["empty-tree-hash", ["bbcs-get-git-data-hash", "empty-tree-data"]],
                    ["commit", ["bbui-make-commit", "empty-tree-hash", ["array"]]],
                    ["commit-data", ["bbcs-object-to-git-data", "commit"]],
                    ["commit-hash", ["bbcs-get-git-data-hash", "commit-data"]]],
           ["bbcs-repo-put-object-binary", "repo", "empty-tree-hash", ["bbcs-get-git-data-binary", "empty-tree-data"]],
           ["bbcs-repo-put-object-binary", "repo", "commit-hash", ["bbcs-get-git-data-binary", "commit-data"]],
           ["bbcs-repo-put-ref", "repo", bbcs.MASTER, "commit-hash"],
           ["bbui-log", ["string", "Created master."]],
           "commit-hash"]],

         ["define", ["bbui-repo-master-hash", "repo"],
          ["bbcs-repo-get-ref", "repo", bbcs.MASTER]],

         ["define", ["bbui-ensure-master", "repo"],
          ["let", [["master-hash", ["bbui-repo-master-hash", "repo"]]],
           ["if", ["===", null, "master-hash"],
            ["bbui-init-master", "repo"],
            "master-hash"]]],

         ["define", ["bbui-root", "repo"],
          ["let*", [["current-master-hash", ["bbui-repo-master-hash", "repo"]],
                    ["current-master", ["bbcs-repo-get-object", "repo", "current-master-hash"]]],
           ["bbcs-repo-get-object", "repo", ["bbcs-get-commit-tree", "current-master"]]]],

         ["define", "*bbui-repo*", ["dnew"]],
         ["define", ["bbui-repo"], ["dref", "*bbui-repo*"]],

         ["define", "bbui-new-todo-item-name", ["js-wrap", bbui.new_todo_item_name]],

         ["define", "bbui-redraw-ui", ["js-wrap", bbui.redraw_ui]],
         ["define", "bbui-draw-item", ["js-wrap", bbui.draw_item]]

        ]

    );

    bbui.run_wat(
        ["let*", [["repo", ["bbcs-init-repo", ["bbui-repo"]]],
                  ["master-hash", ["bbui-ensure-master", "repo"]],
                  ["commit", ["bbcs-repo-get-object", "repo", "master-hash"]]],
         ["bbui-log", ["+", ["string", "Master: "], "master-hash"]],
         ["bbui-log", ["#", "toString", "commit"]],
         ["bbui-redraw-ui"]]
    );

}

bbui.run_wat = function(code) {
    bbui.vm.run(
        ["push-prompt", "*bbui-prompt*",
         ["dlet", "*bbui-repo*", bbui.repo,
          code]]
    );
}

bbui.new_todo_item_name = function(tree) {
    bbutil.assert_type(tree, bbcs.Tree);
    var names = bbcs.tree_names(tree);
    if (names.length === 0) {
        return bbutil.utf8_encode(ftumbler.one);
    } else {
        var last_name = bbutil.get_utf8_string(names[names.length - 1]);
        if (bbutil.string_starts_with(last_name, ".")) {
            return bbutil.utf8_encode(ftumbler.one);
        } else {
            return bbutil.utf8_encode(ftumbler.after(last_name));
        }
    }
}

bbui.add_todo_item = function(utf8_string) {
    bbutil.assert_type(utf8_string, bbutil.UTF8);
    bbui.run_wat(
        ["let*", [["repo", ["bbui-repo"]],
                  ["current-master-hash", ["bbui-repo-master-hash", "repo"]],
                  ["current-master", ["bbcs-repo-get-object", "repo", "current-master-hash"]],
                  ["root", ["bbcs-repo-get-object", "repo", ["bbcs-get-commit-tree", "current-master"]]],
                  ["blob", ["bbcs-make-blob", ["bbutil-utf8-to-binary", utf8_string]]],
                  ["blob-data", ["bbcs-object-to-git-data", "blob"]],
                  ["blob-hash", ["bbcs-get-git-data-hash", "blob-data"]],
                  ["item-name", ["bbui-new-todo-item-name", "root"]],
                  ["tree-entry", ["bbcs-make-tree-entry-for-blob", "blob-hash"]],
                  ["#ignore", ["bbcs-tree-put", "root", "item-name", "tree-entry"]],
                  ["new-root-data", ["bbcs-object-to-git-data", "root"]],
                  ["new-root-hash", ["bbcs-get-git-data-hash", "new-root-data"]],
                  ["commit", ["bbui-make-commit", "new-root-hash", ["array", "current-master-hash"]]],
                  ["commit-data", ["bbcs-object-to-git-data", "commit"]],
                  ["commit-hash", ["bbcs-get-git-data-hash", "commit-data"]]],
         ["bbcs-repo-put-object-binary", "repo", "blob-hash", ["bbcs-get-git-data-binary", "blob-data"]],
         ["bbcs-repo-put-object-binary", "repo", "new-root-hash", ["bbcs-get-git-data-binary", "new-root-data"]],
         ["bbcs-repo-put-object-binary", "repo", "commit-hash", ["bbcs-get-git-data-binary", "commit-data"]],
         ["bbcs-repo-put-ref", "repo", bbcs.MASTER, "commit-hash"],
         ["bbui-log", ["+", ["string", "New master: "], "commit-hash"]],
         ["bbui-log", ["#", "toString", "commit"]],
         ["bbui-redraw-ui"]]
    );
}

bbui.add_form_submit = function() {
    var text = document.getElementById("bbui_input").value;
    bbui.add_todo_item(bbutil.utf8_encode(text));
}

bbui.redraw_ui = function() {
    $("#bbui_content").empty();
    bbui.run_wat(
        ["let*", [["root", ["bbui-root", ["bbui-repo"]]],
                  ["names", ["array-to-list", ["bbcs-tree-names", "root"]]]],
         ["map-list",
          ["lambda", ["name"],
           ["let", [["hash", ["bbcs-get-tree-entry-hash", ["bbcs-tree-get", "root", "name"]]]],
            ["bbui-draw-item", "name", ["bbcs-repo-get-object", ["bbui-repo"], "hash"]]]],
          "names"]]
    );
}

bbui.draw_item = function(name, blob) {
    var name_string = bbutil.get_utf8_string(bbutil.assert_type(name, bbutil.UTF8));
    bbutil.assert_type(blob, bbcs.Blob);
    var content = bbutil.utf8_from_binary(bbcs.get_blob_binary(blob));
    $("#bbui_content").append("<div data-bbui-name='" + name_string + "'>" + content + "</div>");
}
