;; -*- mode: scheme -*-

(define *bbui-prompt* '*bbui-prompt*)
(define *bbui-local* (dnew null))
(define *bbui-remote* (dnew null))

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
(define bbcs-tree-entry-is-tree (.tree_entry_is_tree @bbcs))
(define bbcs-tree-entry-is-blob (.tree_entry_is_blob @bbcs))
(define bbcs-make-committer (.make_committer @bbcs))
(define bbcs-make-commit (.make_commit @bbcs))
(define bbcs-get-commit-tree (.get_commit_tree @bbcs))
(define bbcs-get-commit-parents (.get_commit_parents @bbcs))
(define bbcs-object-to-git-data (.object_to_git_data @bbcs))
(define bbcs-get-git-data-hash (.get_git_data_hash @bbcs))
(define bbcs-get-git-data-binary (.get_git_data_binary @bbcs))
(define bbcs-utc-timestamp (.utc_timestamp @bbcs))
(define bbcs-utc-offset (.utc_offset @bbcs))

(define bbrtc-make-local-base (.make_local_base @bbrtc))
(define bbrtc-make-remote-repo (.make_remote_repo @bbrtc))
(define bbrtc-remote-repo-is-connected (.remote_repo_is_connected @bbrtc))

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
  (log "Getting master hash")
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

(define (bbui-do-redraw-ui)
  (with-bbui-context
    (draw-repo (dref *bbui-repo*))
    (draw-repo (.remote_repo @bbui))))

(define (draw-repo repo)
  (let* ((root (bbui-root repo))
         (names (array-to-list (bbcs-tree-names root))))
    (map-list
     (lambda (name)
       (let ((hash (bbcs-get-tree-entry-hash (bbcs-tree-get root name))))
         (bbui-draw-item name (bbcs-repo-get-object repo hash))))
     names)))

(define (call-with-bbui-context fun)
  (push-prompt *bbui-prompt*
    (dlet *bbui-repo* (.repo @bbui)
      (dlet *bbui-local* (.local @bbui)
        (dlet *bbui-remote* (.remote @bbui)
          (fun))))))

(define-macro (with-bbui-context . body)
  (list call-with-bbui-context (list* lambda () body)))

(define (bbui-add-todo-item content)
  (with-bbui-context
   (bbui-put-item (bbui-repo) (bbui-new-todo-item-name (bbui-root (bbui-repo))) content)))

;;;; 

(define *thread-prompt* '*thread-prompt*)

(define (thread-spawn fun)
  (push-prompt *thread-prompt*
    (fun)))

(define (thread-sleep ms)
  (take-subcont *thread-prompt* k
    (define (callback . ignore)
      (push-prompt *thread-prompt*
        (with-bbui-context
          (push-subcont k))))
    (@setTimeout (js-callback callback) ms)))

(define (bbui-remote-repo-thread base remote-id rrepo)
  (define (init-remote-repo)
    (bbui-log (+ "Attempting connection to remote: " remote-id))
    (bbrtc-make-remote-repo base remote-id))
  (let ((remote-repo (init-remote-repo)))
    (loop
      (thread-sleep 5000)
      (bbui-log "Looping")
      (if (bbrtc-remote-repo-is-connected remote-repo)
          (bbui-pull rrepo remote-repo)
          (set! remote-repo (init-remote-repo))))))

(define (bbui-pull local remote)
  (let* ((local-hash (bbui-repo-master-hash local))
         (remote-hash (bbui-repo-master-hash remote)))
    (if (&& (!== local-hash null)
            (=== (#toString local-hash) (#toString remote-hash)))
        (bbui-log "Local repo up-to-date.")
        (begin
          (bbui-do-pull local remote remote-hash)
          (bbui-redraw-ui)))))

(define (bbui-do-pull local remote remote-hash)
  (bbui-log (+ "Pulling commit from remote: " remote-hash))
  (let* ((commit (bbcs-repo-get-object remote remote-hash))
         (tree-hash (bbcs-get-commit-tree commit)))
    (bbui-pull-tree local remote tree-hash)
    (let* ((commit-data (bbcs-object-to-git-data commit))
           (commit-hash (bbcs-get-git-data-hash commit-data))
           (commit-binary (bbcs-get-git-data-binary commit-data)))
      (bbcs-repo-put-object-binary local commit-hash commit-binary)
      (bbcs-repo-put-ref local +master+ commit-hash))))

(define (bbui-pull-tree local remote tree-hash)
  (let ((local-tree (bbcs-repo-get-object local tree-hash)))
    (if (=== null local-tree)
        (let ((tree (bbcs-repo-get-object remote tree-hash)))
          (map-list (lambda (name)
                      (let* ((entry (bbcs-tree-get tree name))
                             (hash (bbcs-get-tree-entry-hash entry)))
                        (if (bbcs-tree-entry-is-blob entry)
                            (bbui-pull-blob local remote hash)
                            (bbui-pull-tree local remote hash))))
                    (array-to-list (bbcs-tree-names tree)))
          (let* ((tree-data (bbcs-object-to-git-data tree))
                 (tree-hash (bbcs-get-git-data-hash tree-data))
                 (tree-binary (bbcs-get-git-data-binary tree-data)))
            (bbcs-repo-put-object-binary local tree-hash tree-binary)))
        (bbui-log (+ "Already have: " tree-hash)))))

(define (bbui-pull-blob local remote hash)
  (let ((local-blob (bbcs-repo-get-object local hash)))
    (if (=== null local-blob)
        (let* ((blob (bbcs-repo-get-object remote hash))
               (blob-data (bbcs-object-to-git-data blob))
               (blob-hash (bbcs-get-git-data-hash blob-data))
               (blob-binary (bbcs-get-git-data-binary blob-data)))
          (bbcs-repo-put-object-binary local hash blob-binary))
        (bbui-log (+ "Already have: " hash)))))

;;;; Main

(define (bbui-start-sync-threads local-id remote-id repo rrepo)
  (let ((base (bbrtc-make-local-base local-id repo)))
    (thread-spawn (lambda () (bbui-remote-repo-thread base remote-id rrepo)))))

(with-bbui-context
  (let* ((repo (bbcs-init-repo (bbui-repo)))
         (remote-repo (bbcs-init-repo (.remote_repo @bbui)))
         (master-hash (bbui-ensure-master repo))
         (commit (bbcs-repo-get-object repo master-hash)))
    (bbui-log (+ "Master: " master-hash))
    (bbui-log (#toString commit))
    (bbui-redraw-ui)
    (bbui-start-sync-threads (dref *bbui-local*) (dref *bbui-remote*) repo remote-repo)))
