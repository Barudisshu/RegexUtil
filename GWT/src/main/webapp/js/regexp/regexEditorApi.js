function installRegexEditorApi(regexpEditor) {
  var regex_change_listeners = []

  regexpEditor.addRegexChangeListener = function (listener) {
    regex_change_listeners.push(listener)
  }

  var onRegexChange = function () {
    var regexText = regexpEditor.getValue()

    var flags = regexpEditor.regex_flags
    if (!flags) flags = ""

    if (regexText == regexpEditor.old_regex_text && flags == regexpEditor.regex_old_flags) return

    regexpEditor.old_regex_text = regexText
    regexpEditor.regex_old_flags = flags

    var regex = null;
    try {
      regex = new RegExp(regexText, flags);
    }
    catch (e) {
    }

    regexpEditor.regex = regex

    var len = regex_change_listeners.length
    for (var i = 0; i < len; i++) {
      regex_change_listeners[i]();
    }
  }

  regexpEditor.on("change", function () {
    onRegexChange()
  })

  regexpEditor.setFlags = function(flags) {
    regexpEditor.regex_flags = flags
    onRegexChange()
  }

  onRegexChange()

  installRegexpHighlighter(regexpEditor)
}

function installFlagsCheckboxListener(regexpEditor, checkboxes) {

  var rereadFlags = function () {
    var flags = ""

    for (var i = 0; i < checkboxes.length; i++) {
      if (checkboxes[i].checked) {
        flags += $(checkboxes[i]).attr('flagValue')
      }
    }

    regexpEditor.setFlags(flags)
  }

  checkboxes.each(function () {
    $(this).change(function () {
      rereadFlags()
    })
  })

  rereadFlags()
}

function installRegexpHighlighter(regexpEditor) {
  var TokenIterator = require('ace/token_iterator').TokenIterator
  var Range = ace.require("ace/range").Range;
  
  var bracketMarker = {
    id: 'regexBracketHighlighter',

    openBrackets: ['openBracket', 'charClassStart'],
    
    parentBracket: {
      openBracket: 'closedBracket',
      closedBracket: 'openBracket',
      charClassStart: 'charClassEnd',
      charClassEnd: 'charClassStart'
    },

    update: function (html, markerLayer, session, config) {
      var cursorPos = session.getSelection().getCursor()

      var t = session.getTokenAt(cursorPos.row, cursorPos.column + 1)

      var matchBracket
      
      if (!t || !(matchBracket = this.parentBracket[t.type])) {
        if (cursorPos.column == 0) {
          return
        }
        
        t = session.getTokenAt(cursorPos.row, cursorPos.column)

        if (!t || !(matchBracket = this.parentBracket[t.type])) {
          return
        }
      }

      var itr = new TokenIterator(session, cursorPos.row, t.start + 1)
      var currentToken;
      
      var forward = this.openBrackets.indexOf(t.type) > -1
      
      var range = 0
      while (true) {
        if (forward) {
          itr.stepForward()
        }
        else {
          itr.stepBackward()
        }

        currentToken = itr.getCurrentToken();
        if (!currentToken) {
          return
        }

        if (currentToken.type == matchBracket) {
          if (range == 0) {
            break
          }

          range--
        }
        else if (currentToken.type == t.type) {
          range++
        }
      }

      var firstBracketRange = new Range(cursorPos.row, t.start, cursorPos.row, t.start + t.value.length)
      markerLayer.drawSingleLineMarker(html,
                                       firstBracketRange.toScreenRange(session),
                                       'matchedBracket',
                                       config);
      
      var matchedBracketRow = itr.getCurrentTokenRow()
      var matchedBracketColumn = itr.getCurrentTokenColumn()
      var secondBracketRange = new Range(matchedBracketRow, matchedBracketColumn, matchedBracketRow, matchedBracketColumn + currentToken.value.length)

      markerLayer.drawSingleLineMarker(html,
                                       secondBracketRange.toScreenRange(session),
                                       'matchedBracket',
                                       config);
      
    }
  }

  regexpEditor.getSession().addDynamicMarker(bracketMarker)

  regexpEditor.on("change", function() {
    regexpEditor.onChangeBackMarker()
  })
  
  regexpEditor.getSession().selection.on('changeCursor', function() {
    regexpEditor.onChangeBackMarker()
  })
}