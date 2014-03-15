var bbui = Object.create(null);

bbui.repo = null;
bbui.vm = new wat.VM();

bbui.on_load = function() {
    bbui.repo = bbcs.make_idb_repo(bbutil.utf8_encode("main"));
    bbui.vm.run(
        ["begin",

         wat_basics.main,

         ["define", "PROMPT", ["quote", "PROMPT"]],

         ["define", ["synchronize", "appv"],
          ["lambda", "args",
           ["take-subcont", "PROMPT", "k",
            ["define", ["success", "result", "#rest", "#ignore"],
             ["push-prompt", "PROMPT",
              ["push-subcont", "k", "result"]]],
            ["define", ["failure", "error", "#rest", "#ignore"],
             ["push-prompt", "PROMPT",
              ["throw", "error"]]],
            ["apply", "appv",
             ["list*", ["js-callback", "success"], ["js-callback", "failure"], "args"]]]]],
         
         ["define", "bbcs-init-repo", ["synchronize", ["js-wrap", bbcs.init_repo]]],
         ["define", "bbcs-repo-get-ref", ["synchronize", ["js-wrap", bbcs.repo_get_ref]]]
        ]
    );
}
