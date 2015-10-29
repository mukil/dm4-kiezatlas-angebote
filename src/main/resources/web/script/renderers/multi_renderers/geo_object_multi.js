/*global jQuery, dm4c*/
(function ($, dm4c) {

    dm4c.add_multi_renderer('de.kiezatlas.angebote.geo_object_multi', {

        render_info: function (page_models, $parent) {
            console.log("info geo-objects page_models", page_models)
            var list = $('<ul class="geo-object-list">')
            for (var i = 0; i < page_models.length; i++) {
                var item = page_models[i].object
                if (typeof item !== "undefined") {
                    if (item.id !== -1) {
                        var name = item.value
                        // give geo-object-item some standard behaviour
                        $listItem = $('<div id="' +item.id+ '"><img src="/de.kiezatlas/images/info-purple.png" '
                            + 'width="20" alt="Geo Object: '+name+'" title="Show Geo Object: '+name+'">'
                            + '<span class="geo-object-name">' + name + '</span></div>')
                        $listItem.click(function(e) {
                            var topicId = this.id
                            dm4c.do_reveal_related_topic(topicId, "show")
                        })
                        list.append($('<li class="geo-object-item">').html($listItem))
                    }
                }
            }
            $parent.append('<div class="field-label">Einrichtungen</div>').append(list)

        },

        render_form: function (page_models, $parent) {

            var existingTags = page_models
            var allAvailableTags = getAllAvailableGeoObjects()
            var inputValue = ""
            var commaCount = 1

            /* for (var existingTag in existingTags) {
                var element = existingTags[existingTag]
                inputValue += element.value
                if (commaCount < existingTags.length) inputValue += ", "
                commaCount++
            } */

            $parent.append('<div class="field-label">Geo Objects (comma separated)</div>').append(
                '<input type="text" class="geo-objects" value="' +inputValue+ '"></input>')

            setupTagFieldControls('input.geo-objects')

            return function () {

                console.log("form geo-objects page_models", page_models)
                var values = []
                var enteredTags = getTagsSubmitted("input.tags")
                var tagsToReference = []

                // collect all new and existing tags
                for (var label in enteredTags) {
                    var name = enteredTags[label]
                    var tag = getLabelContained(name, allAvailableTags)
                    if (typeof tag === "undefined") {
                        var newTag = dm4c.create_topic(TAG_URI, {"dm4.tags.label": name, "dm4.tags.definition" : ""})
                        tagsToReference.push(newTag)
                    } else {
                        tagsToReference.push(tag)
                    }
                }
                // collect all tags to be deleted
                for (var existingTag in existingTags) {
                    var element = existingTags[existingTag].object.value
                    var elementId = existingTags[existingTag].object.id
                    if (typeof getLabelContained(element, tagsToReference) === undefined) {
                        values.push(dm4c.DEL_PREFIX + elementId)
                    }
                }
                // returning reference to all tags
                for (var item in tagsToReference) {
                    var topic_id = tagsToReference[item].id
                    if (topic_id !== -1) {
                        values.push(dm4c.REF_PREFIX + topic_id)
                    }
                }

                return values

                /** note: creation syntax is unclear to me, the following does not work to add all new tags..
                  * .. implicitly during creation by deepamehta-core
                for (var newItem in newTags) {
                    var tagName = newTags[newItem]
                    var tagTopic = {"value" : tagName, "type_uri": TAG_URI}
                    values.push(tagTopic)
                } **/
            }

            function setupTagFieldControls (identifier) {

                $(identifier).bind("keydown", function( event ) {
                    if ( event.keyCode === $.ui.keyCode.TAB && $( this ).data( "ui-autocomplete" ).menu.active ) {
                        event.preventDefault();
                    } else if (event.keyCode === $.ui.keyCode.ENTER) {
                        // fixme: event.preventDefault();
                    }
                }).autocomplete({minLength: 0,
                    source: function( request, response ) {
                        // delegate back to autocomplete, but extract the last term
                        response( $.ui.autocomplete.filter( allAvailableTags, extractLast( request.term ) ) );
                    },
                    focus: function() {
                        // prevent value inserted on focus
                        return false;
                    },
                    select: function( event, ui ) {
                        var terms = split( this.value );
                        // remove the current input
                        terms.pop();
                        // add the selected item
                        terms.push( ui.item.value );
                        // add placeholder to get the comma-and-space at the end
                        terms.push( "" );
                        this.value = terms.join( ", " );
                        return false;
                    }
                });

                function split( val ) {return val.split( /,\s*/ );}

                function extractLast( term ) {return split( term ).pop();}

            }

            function getAllAvailableGeoObjects() {
                return dm4c.restc.get_topics("ka2.geo_object", false, false, 0).items
            }

            function getLabelContained(label, listOfTagTopics) {
                for (var item in listOfTagTopics) {
                    var tag = listOfTagTopics[item]
                    if (tag.value.toLowerCase() === label.toLowerCase()) return tag
                }
                return undefined
            }

            function getTagsSubmitted (fieldIdentifier) {
                if (typeof $(fieldIdentifier).val() === "undefined") return undefined
                var tagline = $(fieldIdentifier).val().split( /,\s*/ )
                if (typeof tagline === "undefined") throw new Error("Geo Object name input field got somehow broken.. ")
                var qualifiedTags = []
                for (var i=0; i < tagline.length; i++) {
                    var tag = tagline[i]
                    // credits for the regexp go to user Bracketworks in:
                    // http://stackoverflow.com/questions/154059/how-do-you-check-for-an-empty-string-in-javascript#154068
                    if (tag.match(/\S/) !== null) { // remove empty strings
                        // remove possibly entered duplicates from submitted tags
                        var qualified = true
                        for (var k=0; k < qualifiedTags.length; k++) {
                            var validatedTag = qualifiedTags[k]
                            if (validatedTag.toLowerCase() === tag.toLowerCase()) qualified = false
                        }
                        if (qualified) qualifiedTags.push(tag)
                    }
                }
                return qualifiedTags
            }

        }
    })

}(jQuery, dm4c))
