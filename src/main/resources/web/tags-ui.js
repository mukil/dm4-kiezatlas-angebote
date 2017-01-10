
/**
    restc, jQuery + jQuery Autocomplete
    selected_angebot
 */

var tagging = new function() {

    var _ = this
    var nodeId = 'angebot-tags'
    var domElement = undefined
    var cachedTags = undefined  // tags the selected topic already carries
    var availableTags = []      // complete list of tags available in the system
    var REF_PREFIX = "ref_id:"  // duplicate of webclient.js // dm4c
    var DEL_PREFIX = "del_id:"  // duplicate of webclient.js // dm4c

    this.fetchAllTagTopics = function(callback) {
        restc.request("GET", "/core/topic/by_type/dm4.tags.tag", undefined, function(response) {
            availableTags = response
            if (callback) callback()
        })
    }

    this.init = function(domElementId, itemSelectionHandler) {
        if (domElementId) nodeId = domElementId
        if (!domElement) domElement = document.getElementById(nodeId)
        // load all tags (user has read access too)
        _.fetchAllTagTopics(function() {
            // activate third party library
            _.setupJQueryUIAutocompleteField(nodeId)
        })
        if (itemSelectionHandler) _.listenToInputFieldSelection(itemSelectionHandler)
    }

    this.setupTags = function(topicTags) {
        // check and render existing tags
        var inputFieldValue = ""
        var commaCount = 0
        // assemble input line, adding all existing tags into our input-line
        for (var exist in topicTags) {
            var element = topicTags[exist]
            inputFieldValue += element.label
            if (commaCount < topicTags.length) inputFieldValue += ", "
            commaCount++
        }
        // cached loaded tag topics
        cachedTags = topicTags
        // console.log("Setup Tags to Edit", topicTags)
        $('#' + nodeId).val(inputFieldValue)
    }

    // assemble tag topics to be returned
    this.assembleTags = function() {
        var new_model = []
        var enteredTags = _.processTagInputField(nodeId)
        var resultingTags = []
        // create all new and collect existing tag (topics)
        for (var label in enteredTags) {
            var name = enteredTags[label]
            var tag = _.getMatchingTagTopic(name, availableTags)
            if (!tag) {
                // create new topic
                var tag_model = {
                    type_uri: "dm4.tags.tag",
                    childs: {"dm4.tags.label": name, "dm4.tags.definition" : ""}
                }
                var newTag = restc.create_topic(tag_model)
                resultingTags.push(newTag)
            } else {
                // add existing topic to results
                resultingTags.push(tag)
            }
        }
        // identify all tags (which were formerly there but are not in our input-field anymore)
        // to be removed by reference
        for (var el in cachedTags) {
            var element = cachedTags[el].label
            var elementId = cachedTags[el].id
            if (!_.getMatchingTagTopic(element, resultingTags)) { // if
                new_model.push(DEL_PREFIX + elementId)
            }
        }
        // build up model containg reference to all entered tags
        for (var item in resultingTags) {
            var topic_id = resultingTags[item].id
            if (topic_id !== -1) {
                new_model.push(REF_PREFIX + topic_id)
            }
        }
        return new_model
    }

    this.setupJQueryUIAutocompleteField = function(identifier) {
        // initialize domElement for custom events
        if (!domElement) domElement = document.getElementById(identifier)
        // setup jquery autocomplete
        $(domElement).bind("keydown", function( event ) {
            if ( event.keyCode === $.ui.keyCode.TAB && $( this ).data( "ui-autocomplete" ).menu.active ) {
                event.preventDefault()
                // _.fireItemSelected(this.value)
            }
        })
        .autocomplete({
            minLength: 0,
            source: function( request, response ) {
                // delegate back to autocomplete, but extract the last term
                response( $.ui.autocomplete.filter( availableTags, extractLast( request.term ) ) )
            },
            focus: function(event, ui) {
                // prevent value inserted on focus
                return false;
            },
            select: function(event, ui) {
                var tag = ui.item
                var terms = split( this.value )
                // remove the current input
                terms.pop()
                // add the selected item (if not existent)
                var exists = false
                for (var sidx in terms) {
                    if (terms[sidx] === tag.value) exists = true
                }
                if (!exists) terms.push( tag.value )
                // add placeholder to get the comma-and-space at the end
                terms.push( "" )
                this.value = terms.join( ", " )
                _.fireItemSelected(this.value)
                return false
            }
        })

        function split( val ) {return val.split( /,\s*/ ) }

        function extractLast( term ) {return split( term ).pop() }

    }

    this.getMatchingTagTopic = function(label, listOfTagTopics) {
        for (var item in listOfTagTopics) {
            var tag = listOfTagTopics[item]
            if (tag.value.toLowerCase() === label.toLowerCase()) return tag
        }
        return undefined
    }

    this.processTagInputField = function(fieldIdentifier) {
        // do a parameter check
        if ($('#' + fieldIdentifier).children() == 0) {
            throw Error ("Bad identifier given, can't access input field value")
        }
        // split user input into an array strictly by "," thus comma values in tag names are not permitted and cut
        var tagline = $('#' + fieldIdentifier).val().split( /,\s*/ )
        if (!tagline) throw new Error("Tagging field got somehow broken, could not access text value")
        // iterate over all tag labels given and remove duplicates
        var uniqueLabels = []
        for (var i=0; i < tagline.length; i++) {
            var tagInput = tagline[i]
            // credits for the regexp go to user Bracketworks in:
            // http://stackoverflow.com/questions/154059/how-do-you-check-for-an-empty-string-in-javascript#154068
            if (tagInput.match(/\S/) !== null) { // remove empty strings
                // we allow each tag just once
                var qualified = true
                for (var k=0; k < uniqueLabels.length; k++) {
                    var existingTag = uniqueLabels[k]
                    if (existingTag.toLowerCase() === tagInput.toLowerCase()) qualified = false
                }
                // so we make sure to add each tag just once (to our resultset)
                if (qualified) uniqueLabels.push(tagInput)
            }
        }
        return uniqueLabels
    }

    this.listenToInputFieldSelection = function(eventHandler) {
        if (domElement && eventHandler) {
            domElement.addEventListener("selection", function(e) { eventHandler(e) })
        }
    }

    this.fireItemSelected = function(item) {
        var custom = new CustomEvent('selection', { detail: item })
        domElement.dispatchEvent(custom)
    }

}
