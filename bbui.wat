;; -*- mode: scheme -*-

(define *bbui-prompt* '*bbui-prompt*)

(define (bbui-synchronize appv)
  (lambda args
    (take-subcont *bbui-prompt* k
      (define (success result . ignore)
        (push-prompt *bbui-prompt*
          (push-subcont k result)))
      (define (failure error . ignore)
        (push-prompt *bbui-prompt*
          (throw error)))
      (apply appv (list* (js-callback success) (js-callback failure) args)))))

(define bbcs-init-repo (bbui-synchronize (.init_repo @bbcs)))
(define bbcs-repo-get-ref (bbui-synchronize (.repo_get_ref @bbcs)))
(define bbcs-repo-put-ref (bbui-synchronize (.repo_put_ref @bbcs)))
(define bbcs-repo-get-object-binary (bbui-synchronize (.repo_get_object_binary @bbcs)))
(define bbcs-repo-put-object-binary (bbui-synchronize (.repo_put_object_binary @bbcs)))
(define bbcs-repo-get-object (bbui-synchronize (.repo_get_object @bbcs)))

(define bbcs-make-blob (.make_blob @bbcs))
(define bbcs-make-tree (.make_tree @bbcs))
(define bbcs-tree-put (.tree_put @bbcs))
(define bbcs-tree-get (.tree_get @bbcs))
(define bbcs-tree-names (.tree_names @bbcs))
(define bbcs-make-tree-entry-for-blob (.make_tree_entry_for_blob @bbcs))
(define bbcs-make-tree-entry-for-tree (.make_tree_entry_for_tree @bbcs))
(define bbcs-get-tree-entry-hash (.get_tree_entry_hash @bbcs))
(define bbcs-make-committer (.make_committer @bbcs))
(define bbcs-make-commit (.make_commit @bbcs))
(define bbcs-get-commit-tree (.get_commit_tree @bbcs))
(define bbcs-get-commit-parents (.get_commit_parents @bbcs))
(define bbcs-object-to-git-data (.object_to_git_data @bbcs))
(define bbcs-get-git-data-hash (.get_git_data_hash @bbcs))
(define bbcs-get-git-data-binary (.get_git_data_binary @bbcs))
(define bbcs-utc-timestamp (.utc_timestamp @bbcs))
(define bbcs-utc-offset (.utc_offset @bbcs))

(define bbutil-utf8-encode (.utf8_encode @bbutil))
(define bbutil-utf8-decode (.utf8_decode @bbutil))
(define bbutil-get-utf8-string (.get_utf8_string @bbutil))
(define bbutil-utf8-to-binary (.utf8_to_binary @bbutil))
(define bbutil-utf8-from-binary (.utf8_from_binary @bbutil))

(define +master+ (.MASTER @bbcs))

(define (bbui-log msg)
  (#log @console msg))

(define (bbui-make-committer)
  (bbcs-make-committer
    (bbutil-utf8-encode "Buckybase")
    (bbutil-utf8-encode "support@buckybase.org")
    (bbcs-utc-timestamp)
    (bbcs-utc-offset)))

(define (bbui-make-commit tree-hash parent-hashes)
  (let ((committer (bbui-make-committer)))
    (bbcs-make-commit tree-hash parent-hashes committer committer
                      (bbutil-utf8-encode "Automated commit."))))

(define (bbui-init-master repo)
  (let* ((empty-tree (bbcs-make-tree))
         (empty-tree-data (bbcs-object-to-git-data empty-tree))
         (empty-tree-hash (bbcs-get-git-data-hash empty-tree-data))
         (commit (bbui-make-commit empty-tree-hash (array)))
         (commit-data (bbcs-object-to-git-data commit))
         (commit-hash (bbcs-get-git-data-hash commit-data)))
    (bbcs-repo-put-object-binary repo empty-tree-hash (bbcs-get-git-data-binary empty-tree-data))
    (bbcs-repo-put-object-binary repo commit-hash (bbcs-get-git-data-binary commit-data))
    (bbcs-repo-put-ref repo +master+ commit-hash)
    (bbui-log "Created master.")
    commit-hash))

(define (bbui-repo-master-hash repo)
  (bbcs-repo-get-ref repo +master+))

(define (bbui-ensure-master repo)
  (let ((master-hash (bbui-repo-master-hash repo)))
    (if (=== null master-hash)
        (bbui-init-master repo)
        master-hash)))

(define (bbui-root repo)
  (let* ((current-master-hash (bbui-repo-master-hash repo))
         (current-master (bbcs-repo-get-object repo current-master-hash)))
    (bbcs-repo-get-object repo (bbcs-get-commit-tree current-master))))

(define *bbui-repo* (dnew null))
(define (bbui-repo) (dref *bbui-repo*))

(define bbui-new-todo-item-name (.new_todo_item_name @bbui))

(define bbui-redraw-ui (.redraw_ui @bbui))
(define bbui-draw-item (.draw_item @bbui))

(define (bbui-put-item repo item-name content-utf8)
  (let* ((current-master-hash (bbui-repo-master-hash repo))
         (current-master (bbcs-repo-get-object repo current-master-hash))
         (root (bbcs-repo-get-object repo (bbcs-get-commit-tree current-master)))
         (blob (bbcs-make-blob (bbutil-utf8-to-binary content-utf8)))
         (blob-data (bbcs-object-to-git-data blob))
         (blob-hash (bbcs-get-git-data-hash blob-data))
         (tree-entry (bbcs-make-tree-entry-for-blob blob-hash))
         (ignore (bbcs-tree-put root item-name tree-entry))
         (new-root-data (bbcs-object-to-git-data root))
         (new-root-hash (bbcs-get-git-data-hash new-root-data))
         (commit (bbui-make-commit new-root-hash (array current-master-hash)))
         (commit-data (bbcs-object-to-git-data commit))
         (commit-hash (bbcs-get-git-data-hash commit-data)))
    (bbcs-repo-put-object-binary repo blob-hash (bbcs-get-git-data-binary blob-data))
    (bbcs-repo-put-object-binary repo new-root-hash (bbcs-get-git-data-binary new-root-data))
    (bbcs-repo-put-object-binary repo commit-hash (bbcs-get-git-data-binary commit-data))
    (bbcs-repo-put-ref repo +master+ commit-hash)
    (bbui-log (+ "New master: " commit-hash))
    (bbui-log (#toString commit))
    (bbui-redraw-ui)))

(define (bbui-pull local remote)
  (let ((local-hash (bbui-repo-master-hash local))
        (remote-hash (bbui-repo-master-hash remote)))
    (if (=== (#toString local-hash) (#toString remote-hash))
        (bbui-log "Local repo up-to-date.")
        (bbui-do-pull local remote remote-hash))))

(define (bbui-pull local remote-hash)
  (bbui-log "Pulling remote repo."))

(define (bbui-do-redraw-ui)
  (with-bbui-context
    (let* ((root (bbui-root (bbui-repo)))
           (names (array-to-list (bbcs-tree-names root))))
      (map-list
       (lambda (name)
         (let ((hash (bbcs-get-tree-entry-hash (bbcs-tree-get root name))))
           (bbui-draw-item name (bbcs-repo-get-object (bbui-repo) hash))))
       names))))

(define (call-with-bbui-context fun)
  (push-prompt *bbui-prompt*
    (dlet *bbui-repo* (.repo @bbui)
      (fun))))

(define-macro (with-bbui-context . body)
  (list call-with-bbui-context (list* lambda () body)))

(define (bbui-add-todo-item content)
  (with-bbui-context
   (bbui-put-item (bbui-repo) (bbui-new-todo-item-name (bbui-root (bbui-repo))) content)))

(with-bbui-context
  (let* ((repo (bbcs-init-repo (bbui-repo)))
         (master-hash (bbui-ensure-master repo))
         (commit (bbcs-repo-get-object repo master-hash)))
    (bbui-log (+ "Master: " master-hash))
    (bbui-log (#toString commit))
    (bbui-redraw-ui)))

