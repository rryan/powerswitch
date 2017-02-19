// TODO:
// - prettier window (fullscreen?)
// - prettier window contents
// - stack is not always correct (reader)

var notify = function(string) {
  console.log(string);
};

var ordered_tab_ids = [];

var showPopup = function(mode) {
  var window_width = 850;
  var window_height = 400;
  var window_left =
      (window.screen.availWidth - window_width) / 2 +
          window.screen.availLeft;
  var window_top =
      (window.screen.availHeight - window_height) / 2 +
          window.screen.availTop;

  window.open(
      "popup.html#" + mode, undefined,
      "location=no,chrome=no,fullscreen=yes,resizable=no," +
          "height=" + window_height + ",width=" + window_width + "," +
          "top=" + window_top + ",left=" + window_left);
};

chrome.commands.onCommand.addListener(function(command) {
  if (command === "switch_tab") {
    showPopup('tab');
  } else if (command === "switch_bookmark") {
    showPopup('bookmark');
  } else {
    debugger;
  }
});

chrome.windows.getAll({populate: true}, function(windows) {
  windows.forEach(function(window) {
    window.tabs.forEach(function(tab) {
      notify("on startup, found tab " + tab.id + ", " + tab.title);
      ordered_tab_ids.push(tab.id);
    });
  });
});

var removeTabWithId = function(tab_id) {
  var tab_index = ordered_tab_ids.indexOf(tab_id);
  if (tab_index === -1) {
    notify("could not find tab to remove: " + tab_id);
    debugger;
  } else {
    ordered_tab_ids = concat(
        ordered_tab_ids.slice(0, tab_index),
        ordered_tab_ids.slice(tab_index + 1));
  }
};

var updateOrderedTabsWithCurrentTab = function() {
  chrome.windows.getLastFocused(function(window) {
    chrome.tabs.query({
      active: true,
      windowId: window.id
    }, function(tabs) {
      if (tabs.length > 0) {
        var tab = tabs[0];
        notify('current tab is ' + tab.id + ", " + tab.title);
        // We asked for just active tabs in the current window, so there should be at most one
        // tab. ("At most" since I guess that the tab/window could be closed by now.)
        removeTabWithId(tab.id);
        ordered_tab_ids = concat([tab.id], ordered_tab_ids);
      }
    });
  });
};

chrome.tabs.onCreated.addListener(function(tab) {
    notify('onCreated ' + tab.id);
  ordered_tab_ids = concat([tab.id], ordered_tab_ids);
});

chrome.tabs.onRemoved.addListener(function(tab_id, remove_info) {
  notify('onRemoved ' + tab_id);
  removeTabWithId(tab_id);
});

chrome.tabs.onSelectionChanged.addListener(function(tab_id, select_info) {
  notify('onSelectionChanged ' + tab_id);
  updateOrderedTabsWithCurrentTab();
});

chrome.windows.onFocusChanged.addListener(function(window_id) {
  notify('onFocusChanged to window ' + window_id);
  if (window_id !== chrome.windows.WINDOW_ID_NONE) {
    updateOrderedTabsWithCurrentTab();
  }
});

chrome.tabs.onReplaced.addListener(function(added_tab_id, removed_tab_id) {
  notify("onReplaced: " + added_tab_id + " replaced " + removed_tab_id);
  for (var i = 0; i < ordered_tab_ids.length; i++) {
    var ordered_tab_id = ordered_tab_ids[i];
    if (removed_tab_id === ordered_tab_id) {
      ordered_tab_ids[i] = added_tab_id;
      return;
    }
  }
  notify("did not find tab to remove");
  debugger;
});

var bookmark_ids = [];
var bookmarks = [];
chrome.bookmarks.getTree(function(root) {
  var nodes = root;
  while (nodes.length > 0) {
    var node = nodes.pop();
    if (node.url !== undefined) {
      bookmarks.push(node);
      bookmark_ids.push(node.id);
    } else {
      Array.prototype.push.apply(nodes, node.children);
    }
  }
});

var removeBookmarkWithId = function(bookmark_id) {
  var bookmark_index = bookmark_ids.indexOf(bookmark_id);
  if (bookmark_index === -1) {
    notify("could not find bookmark to remove: " + bookmark_id);
    debugger;
  } else {
    bookmark_ids = concat(
      bookmark_ids.slice(0, bookmark_index),
      bookmark_ids.slice(bookmark_index + 1));
    bookmarks = concat(
      bookmarks.slice(0, bookmark_index),
      bookmarks.slice(bookmark_index + 1));
  }
};

chrome.bookmarks.onCreated.addListener(function(bookmark_id, bookmark) {
  notify('onCreated ' + bookmark.id);
  bookmark_ids = concat([bookmark.id], bookmark_ids);
  bookmarks = concat([bookmark], bookmarks);
});

chrome.bookmarks.onRemoved.addListener(function(bookmark_id, remove_info) {
  notify('onRemoved ' + bookmark_id);
  removeBookmarkWithId(bookmark_id);
});
