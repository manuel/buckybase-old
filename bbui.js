var bbui = Object.create(null);

bbui.local = null;
bbui.remote = null;
bbui.vm = new wat.VM();

bbui.on_load = function() {
    bbui.local = bbutil.utf8_encode(prompt("Local ID"));
    bbui.remote = bbutil.utf8_encode(prompt("Remote ID"));
    bbui.repo = bbcs.make_idb_repo(bbutil.utf8_encode("main"));
    bbui.remote_repo = bbcs.make_idb_repo(bbui.remote);
    bbui.load_file("bbui.wat");
    bbui.load_file("wat-js/test.wat");
}

bbui.load_file = function(name) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", name + "?" + Math.random(), true);
    xhr.onload = function (e) {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                bbui.vm.eval(xhr.responseText);
            } else {
                console.error(xhr.statusText);
            }
        }
    };
    xhr.onerror = function (e) {
        console.error(xhr.statusText);
    };
    xhr.send(null);
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
    bbui.vm.call("bbui-add-todo-item", utf8_string);
}

bbui.add_form_submit = function() {
    var text = document.getElementById("bbui_input").value;
    bbui.add_todo_item(bbutil.utf8_encode(text));
}

bbui.redraw_ui = function() {
    $("#bbui_content").empty();
    bbui.vm.call("bbui-do-redraw-ui");
}

bbui.draw_item = function(name, blob) {
    var name_string = bbutil.get_utf8_string(bbutil.assert_type(name, bbutil.UTF8));
    bbutil.assert_type(blob, bbcs.Blob);
    var content = bbutil.utf8_from_binary(bbcs.get_blob_binary(blob));
    $("#bbui_content").append("<div data-bbui-name='" + name_string + "'>" + content + "</div>");
}

