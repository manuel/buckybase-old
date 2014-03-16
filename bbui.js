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

         ["define", "bbcs-make-tree", ["js-wrap", bbcs.make_tree]],
         ["define", "bbcs-make-committer", ["js-wrap", bbcs.make_committer]],
         ["define", "bbcs-make-commit", ["js-wrap", bbcs.make_commit]],
         ["define", "bbcs-object-to-git-data", ["js-wrap", bbcs.object_to_git_data]],
         ["define", "bbcs-get-git-data-hash", ["js-wrap", bbcs.get_git_data_hash]],
         ["define", "bbcs-get-git-data-binary", ["js-wrap", bbcs.get_git_data_binary]],
         ["define", "bbcs-utc-timestamp", ["js-wrap", bbcs.utc_timestamp]],
         ["define", "bbcs-utc-offset", ["js-wrap", bbcs.utc_offset]],

         ["define", "bbutil-utf8-encode", ["js-wrap", bbutil.utf8_encode]],

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

         ["define", ["bbui-ensure-master", "repo"],
          ["let", [["master-hash", ["bbcs-repo-get-ref", "repo", bbcs.MASTER]]],
           ["if", ["===", null, "master-hash"],
            ["bbui-init-master", "repo"],
            "master-hash"]]],

         ["define", "*bbui-repository*", ["dnew"]],
         ["define", ["bbui-repository"], ["dref", "*bbui-repository*"]]

        ]

    );

    bbui.run_wat(
        ["let*", [["repo", ["bbcs-init-repo", ["bbui-repository"]]],
                  ["master-hash", ["bbui-ensure-master", "repo"]],
                  ["commit", ["bbcs-repo-get-object", "repo", "master-hash"]]],
         ["bbui-log", ["+", ["string", "Master: "], "master-hash"]],
         ["bbui-log", ["#", "toString", "commit"]]]
    );
}

bbui.run_wat = function(code) {
    bbui.vm.run(
        ["push-prompt", "*bbui-prompt*",
         ["dlet", "*bbui-repository*", bbui.repo,
          code]]
    );
}
