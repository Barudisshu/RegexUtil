var Range = ace.require("ace/range").Range;

function installRegexpFindDependency(regexpEditor, textEditor, matchesResult, groupTable) {
  var marker = {
    id: 'regexTextFindMarked',

    update: function (html, markerLayer, session, config) {
      var regex = regexpEditor.regex
      if (!regex) return

      var start = config.firstRow, end = config.lastRow;

      var text = session.getValue()

      var r;

      regex.lastIndex = 0
      
      var matchCount = 0
      
      var currentMatchResult
      var currentMatchResultRange
      var lastMatchResult
      
      var cursorPos = session.getSelection().getCursor()
      
      while (r = regex.exec(text)) {
        if (r[0].length == 0) {
          break // regexp is empty
        }
        
        var startPos = session.getDocument().indexToPosition(r.index)
        var endPos = session.getDocument().indexToPosition(r.index + r[0].length)
        
        var range = Range.fromPoints(startPos, endPos)

        drawLineMarker(markerLayer, html, range, session, (matchCount & 1) ? 'matched2' : 'matched1', config)
        
        matchCount++
        lastMatchResult = r
        
        if (!regex.global) {
          break
        }
        else {
          if (range.contains(cursorPos.row, cursorPos.column)) {
            currentMatchResult = r
            currentMatchResultRange = range
          }
        }
      }
      
      if (matchesResult) {
        var matchResultText
        
        if (matchCount == 0) {
          matchResultText = "No matches"
        }
        else {
          if (regex.global) {
            matchResultText = matchCount + " matches found"
          }
          else {
            matchResultText = ""
          }
        }
        
        matchesResult.text(matchResultText)
      }
      
      if (groupTable) {
        if (matchCount == 0) {
          $('td:last-child', groupTable).html("<span class='spec'>No matches found<span>")
        }
        else {
          if (matchCount == 1) {
            currentMatchResult = lastMatchResult
            currentMatchResultRange = range
          }

          if (currentMatchResultRange) {
            drawLineMarker(markerLayer, html, currentMatchResultRange, session, 'currentMatchResult', config)
          }

          if (currentMatchResult) {
            var groupRows = groupTable.groupRows
            if (groupRows) {
              for (var i = 0; i < groupRows.length; i++) {
                var tr = groupRows[i]

                var s = currentMatchResult[i]
                if (s == undefined || s == null) {
                  $('td:last-child', tr).html("<span class='spec'>null<span>")
                }
                else {
                  $('td:last-child', tr).empty().append($("<span class='groupText'></span>").text(s))
                }
                
              }
            }
          }
          else {
            $('td:last-child', groupTable).html("<span class='spec'>please, move the cursor to matched text<span>")
          }
          
        }
      }
    }
  }

  textEditor.getSession().addDynamicMarker(marker)

  textEditor.on("change", function() {
    textEditor.onChangeBackMarker()
  })
  textEditor.getSession().selection.on('changeCursor', function() {
    textEditor.onChangeBackMarker()
  })

  function fixGroupCount() {
    if (groupTable) {
      var bracketStructure = regexpEditor.session.bracketStructure

      var groupRows = groupTable.groupRows
      if (groupRows == undefined) {
        groupTable.groupRows = groupRows = []
        groupRows.push($("tr", groupTable))

        groupRows[0].mouseenter(function() {
          regexpEditor.setHighlightedGroup(0)
        })
      }
      
      if (groupRows.length != bracketStructure.groups.length + 1) {
        if (groupRows.length > bracketStructure.groups.length + 1) {
          while (groupRows.length > bracketStructure.groups.length + 1) {
            groupRows.pop().remove()
          }
        }
        else {
          for (var i = groupRows.length; i < bracketStructure.groups.length + 1; i++) {
            var e = $("<tr><td>#" + i + "</td><td></td></tr>")
            groupTable.append(e)
            groupRows.push(e)

            e[0].groupIndex = i

            e.mouseenter(function() {
              regexpEditor.setHighlightedGroup(this.groupIndex)
            })
          }
        }
      }
    }
  }
  
  regexpEditor.addRegexChangeListener(function () {
    textEditor.onChangeBackMarker()
    fixGroupCount()
  })

  fixGroupCount()

  if (groupTable) {
    regexpEditor.matchedBracketMarker.addSelectedGroupListener(function() {
      var selectedGroupIndex = regexpEditor.matchedBracketMarker.selectedGroupIndex

      var groupRows = groupTable.groupRows

      for (var i = 0; i < groupRows.length; i++) {
        groupRows[i].removeClass('selectedGroupTr');
      }

      if (selectedGroupIndex) {
        groupRows[selectedGroupIndex].addClass('selectedGroupTr')
      }
    })

    groupTable.mouseleave(function() {
      regexpEditor.setHighlightedGroup(undefined)
    })
  }

  textEditor.onChangeBackMarker()
}
