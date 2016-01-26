
/**
    restc, jQuery + jQuery Autocomplete
    selected_angebot
 */

var tagging = new function() {

    var _ = this
    var nodeId = '#angebot-tags'
    var topicTags = undefined // tags the selected topic already carries
    var allReadableTags = []
    var REF_PREFIX = "ref_id:"  // duplicate of webclient.js // dm4c
    var DEL_PREFIX = "del_id:"  // duplicate of webclient.js // dm4c

    this.fetchAllTagTopics = function() {
        return restc.get_topics("dm4.tags.tag", false, false, 0).items
    }

    /** Make sure, selected_angebot is initialized */
    this.init = function() {
        // load all tags (user has read access too)
        allReadableTags = _.fetchAllTagTopics()
        // check and render existing tags
        if (!selected_angebot) throw new Error("Angebot is not yet initialized, can not introduce tags!")
        if (!selected_angebot.hasOwnProperty("tags")) {
            console.log("No Tags set yet!")
        } else { // existing tag topic
            topicTags = selected_angebot["tags"]
            var inputFieldValue = ""
            var commaCount = 1
            // assemble input line, adding all existing tags into our input-line
            for (var exist in topicTags) {
                var element = topicTags[exist]
                inputFieldValue += element.label
                if (commaCount < topicTags.length) inputFieldValue += ", "
                commaCount++
            }
            $(nodeId).val(inputFieldValue)
        }
        // activate third party library
        _.setupJQueryUIAutocompleteField(nodeId)
    }

    // assemble tag topics to be returned
    this.assembleTags = function() {
        var new_model = []
        var enteredTags = _.processTagInputField(nodeId)
        var resultingTags = []
        // create all new and collect existing tag (topics)
        for (var label in enteredTags) {
            var name = enteredTags[label]
            var tag = _.getMatchingTagTopic(name, allReadableTags)
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
        // identify all tags (which were formerly there but are not in our input-field anymore these are)
        // to to be removed by reference
        for (var el in topicTags) {
            /** var element = topicTags[el].object.value
            var elementId = topicTags[el].object.id **/
            var element = topicTags[el].label
            var elementId = topicTags[el].id
            if (_.getMatchingTagTopic(element, resultingTags) == undefined) { // if
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
        $(identifier).bind("keydown", function( event ) {
            if ( event.keyCode === $.ui.keyCode.TAB && $( this ).data( "ui-autocomplete" ).menu.active ) {
                event.preventDefault()
            } else if (event.keyCode === $.ui.keyCode.ENTER) {
                // fixme: event.preventDefault()
            }
        }).autocomplete({minLength: 0,
            source: function( request, response ) {
                // delegate back to autocomplete, but extract the last term
                response( $.ui.autocomplete.filter( allReadableTags, extractLast( request.term ) ) )
            },
            focus: function() {
                // prevent value inserted on focus
                return false;
            },
            select: function( event, ui ) {
                var terms = split( this.value )
                // remove the current input
                terms.pop()
                // add the selected item
                terms.push( ui.item.value )
                // add placeholder to get the comma-and-space at the end
                terms.push( "" )
                this.value = terms.join( ", " )
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
        if ($(fieldIdentifier).children() == 0) {
            throw new Error ("Bad identifier given, can't access input field value")
        }
        // split user input into an array strictly by "," thus comma values in tag names are not permitted and cut
        var tagline = $(fieldIdentifier).val().split( /,\s*/ )
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

}
