
// -------------------------------------- Custom Angebote JS Client (Edit, Show, Assign) --------------- //

function do_save_angebot_and_go_assign() {
    do_save_angebot()
    var resource = $('#assignment-link').attr("data-my-href")
    window.document.location.replace(resource)
}

function do_save_angebot_and_go_home() {
    do_save_angebot()
    go_to_my_angebot_listing()
}

// ### display "Eingaben gesichert!"
// ### Check if form is valid: do not allow for empty name, empty description or empty contact
function do_save_angebot() {
    show_saving_icon('#do-save .icon')
    // Read in new values
    var name = $('#angebot-name').val().trim()
    var descr = CKEDITOR.instances["angebot-beschreibung"].getData()
    var contact = $('#angebot-kontakt').val().trim()
    var webpage = $('#angebot-webpage').val().trim()
    if (!autocorrect_url(webpage)) {
        if (webpage === "http://" || webpage === "https://") {
            webpage = "" // Delete/Turn webpage entry an empty string
        } else {
            console.warn("Webpage URL is INVALID")
        }
    }
    // analyze tag input
    var tags = tagging.assembleTags()
    var topic = undefined
    if (selected_angebot) {
        // Update
        if (selected_angebot.id !== 0) {
            topic = selected_angebot
            var topic_model = {
                "id" : selected_angebot.id,
                "type_uri" : "ka2.angebot",
                "childs": {
                    "ka2.angebot.name" : name,
                    "ka2.angebot.beschreibung" : descr,
                    "ka2.angebot.kontakt" : contact,
                    "ka2.angebot.webpage" : webpage,
                    "dm4.tags.tag": tags
                }
            }
            console.log("Upading Angebot Topic", topic_model)
            topic = topic_model
            restc.update_topic(topic_model)
        }
    } else {
        // Create
        var topic_id = $('.form-area.angebot').attr("id")
            topic_id = -1
        var topic_model = {
            "id" : topic_id,
            "type_uri" : "ka2.angebot",
            "childs": {
                "ka2.angebot.name" : name,
                "ka2.angebot.beschreibung" : descr,
                "ka2.angebot.kontakt" : contact,
                "ka2.angebot.webpage" : webpage,
                "dm4.tags.tag": tags
            }
        }
        console.log("Saving Angebot Topic: ", topic_model)
        topic = restc.create_topic(topic_model)
    }
    hide_saving_icon('#do-save .icon')
    return topic
}

/** function validate_angebots_form() {
    var form = document.getElementById('angebot-form')
    var angebotBeschreibung = document.getElementById('angebot-beschreibung')
    var error = document.querySelector('.error')
    console.log("Registering Form Submit Handler, Name", angebotBeschreibung, error)
    form.addEventListener("submit", function (event) {
        var descr = CKEDITOR.instances["angebot-beschreibung"].getData()
        if (descr.length <= 3) {
            console.warn("Angebotsbeschreibung zu kurz")
            error.innerHTML = "Angebotsbeschreibung zu kurz"
            error.className = "error active"
            // And we prevent the form from being sent by canceling the event
            event.preventDefault()
        }
    }, false)
} **/

function render_angebot_form() {
    if (!selected_angebot) return
    // Angebotsinfo
    var name = selected_angebot.name
    var contact = selected_angebot.kontakt
    var webpage = selected_angebot.webpage
    var descr = selected_angebot.beschreibung
    // tagging.init() does this var tags = selected_angebot.tags
    //
    $('#angebot-name').val(name)
    $('#angebot-kontakt').val(contact)
    CKEDITOR.instances["angebot-beschreibung"].setData(descr)
    $('#angebot-webpage').val(webpage)
    $('#assignment-link').attr("data-my-href", URL_ANGEBOT_ASSIGNMENT + selected_angebot.id)
}

function clear_angebot_form() {
    $('.form-area.angebot').attr("id", -1)
    $('#angebot-name').val('')
    CKEDITOR.instances["angebot-beschreibung"].setData('')
    $('#angebot-kontakt').val('')
    $('#angebot-webpage').val('')
    $('#angebot-tags').val('')
}


// ---- Methods used for ASSIGNMENT screen (angebote to a geo object) --- //

function render_assignment_page() {
    load_angebot_by_resource_path()
    init_datepicker()
    render_angebot_shortinfo()
    load_angebote_places_and_dates(render_assignments_to_edit, false)
}

function clear_assignment_dateform() {
    $('#from').val('')
    $('#to').val('')
    $('.date-area .einrichtung-name').text('...')
    $('.date-area').addClass("disabled")
    $('#do-assign .text').text("Speichern")
    $('#do-delete').addClass("hidden")
}

function init_datepicker() {
    // jQuery UI Datepicker Widget with German Local Dependency
    // $.datepicker.setDefaults($.datepicker.regional["de"])
    // init our two datepicker fields
    fromDate = $( "#from" ).datepicker({
        defaultDate: "+1w",
        changeMonth: true,
        numberOfMonths: 3,
        dateFormat: "DD, d MM, yy",
        // dateFormat: "d.m yy",
        onClose: function( selectedDate ) {
            $( "#to" ).datepicker("option", "minDate", selectedDate )
        }
    })
    toDate = $( "#to" ).datepicker({
        defaultDate: "+1w",
        changeMonth: true,
        numberOfMonths: 3,
        dateFormat: "DD, d MM, yy",
        // dateFormat: "d.m yy",
        onClose: function( selectedDate ) {
            $( "#from" ).datepicker( "option", "maxDate", selectedDate )
        }
    })
}

// ---- Create Assignments for selected_angebot to Geo Objects -----

function do_save_assignment(e) {
    // ### fixme: firefox can not parse german localized date strin
    // ### notify user when an assignment already exists..
    // ### Insert default values to initialize if not specified
    show_saving_icon('#update-assignment icon')
    var fromInput = $('input#from').val()
    var toInput = $('input#to').val()
    var fromDate = -1
    var toDate = -1
    // parse dates
    if (fromInput.length > 0) {
        // fromDate = $.datepicker.parseDate("dd. MM yy", fromInput)
        fromDate = new Date(fromInput).getTime()
    }
    if (toInput.length > 0) {
        // toDate = $.datepicker.parseDate("dd. MM yy", toInput)
        toDate = (new Date(toInput).getTime() + 86400000) // we want to shift this value always about 24hours
    }
    console.log("Datepicker delivered us from, to", fromInput, fromDate, toInput, toDate)
    // Chromium has no problem to deliver us timestamps from a german locale
    if (!selected_angebot) throw new Error("Assertion failed: An angebot must be loaded before an assignment can be created.")
    // Update
    if (selected_assignment && (fromDate != selected_assignment.von || toDate != selected_assignment.bis)) {
        console.log("Dates Changed - Update Assignment", fromDate, selected_assignment.von,
            "To:", toDate, selected_assignment.bis)
        // Do Update
        restc.request("POST", "/angebote/assignment/" +selected_assignment.id + "/" + fromDate + "/" + toDate)
    } else {
        // Create
        if (!selected_angebot) throw Error("Saving Assignment Aborted, selected Angebotsinfo NOT SET")
        if (!selected_geo_object) throw Error("Saving Assignment Abortted, selected Einrichtung NOT SET")
        var assocModel = {
            "type_uri": "ka2.angebot.assignment",
            "role_1": {
                "topic_id": selected_angebot.id,
                "role_type_uri":"dm4.core.parent"
            },
            "role_2": {
                "topic_id": selected_geo_object.id,
                "role_type_uri":"dm4.core.child"
            }
        }
        // do create
        restc.request("POST", "/angebote/assignment/" + fromDate + "/" + toDate, assocModel)
    }
    // refresh GUI
    selected_assignment = undefined
    selected_geo_object = undefined
    // refresh GUI
    clear_assignment_dateform()
    hide_saving_icon('#update-assignment icon')
    render_assignment_page()
}

function do_delete_assignment() {
    // Do Delete
    if (selected_assignment) {
        restc.request("POST", "/angebote/assignment/" +selected_assignment.id + "/delete")
        selected_assignment = undefined
        selected_geo_object = undefined
    }
    // refresh GUI
    clear_assignment_dateform()
    render_assignment_page()
}

// -------------------------- GUI Methods for Angebote Assignment and Editing ------------------- //

function do_search_geo_objects_by_name(renderer) { // usually calls show_geo_object_search_results
    var queryString = $("#name-search").val()
    if (queryString.indexOf("*") === -1) {
        queryString += "*"
    }
    queryString = encodeURIComponent(queryString, "UTF-8")
    // ### hacking message display
    $('.form-area div.einrichtungen').html("Suche nach Einrichtungen gestartet ...")
    $.ajax({
        type: "GET", url: "/geoobject/search/by_name?query=" + queryString,
        success: function(obj) {
            renderer(obj)
        },
        error: function(x, s, e) {
            throw Error ("ERROR", "x: " + x + " s: " + s + " e: " + e)
        }
    })
}

function render_geo_object_search_results(results) {
    $('.form-area div.einrichtungen').empty()
    for (var i in results) {
        var obj = results[i]
        if (obj) {
            var $element = $('<input type="radio" title="Auswahl der Einrichtung im Bezirk ' + obj.bezirk_name + '" name="group" id="' + obj.id
                    + '" value="geo-'+obj.id+'"><label title="Auswahl der Einrichtung im Bezirk ' + obj.bezirk_name + '" for="'+obj.id+'">'
                    + obj.name + ', <span class="label">' + obj.anschrift + '</span></label><br/>')
            $('.form-area div.einrichtungen').append($element)
        } else {
            console.warn("Error during rendering Geo Objects Assignment", obj)
        }
    }
    if (results.length === 0) {
        $('.form-area div.einrichtungen').append('<div>Haben Sie die gew&uuml;nschte Einrichtung nicht finden k&ouml;nnen? Dann k&ouml;nnen '
            + 'Sie es entweder mit einer leicht ver&auml;nderten Suchanfrage erneut versuchen oder '
            + 'einen Ort <a href="/geoobject/create">neu im Kiezatlas eintragen</a>. Alternativ k&ouml;nnen wir Ihnen noch anbieten den Namen des Einrichtungsdatensatz '
        + 'erst noch einmal &uuml;ber die Umkreis- bzw. Volltextsuche des <a href="/" target="_blank">Gesamtstadtplan</a> abzufragen.</div>')
    } else {
        $('.form-area .search-info').text(results.length + ' Ergebnisse')
    }
    // equip all buttons with a click handler each (at once)
    $('input[name=group]').on('click', select_geo_object)
}

function render_angebot_shortinfo() {
    if (!selected_angebot || !selected_angebot.hasOwnProperty("id")) {
       console.log("No Angebot (With ID) selected, loaded", selected_angebot)
       return
    }
    // Angebotsinfo
    var contact = selected_angebot.kontakt
    var webpage = selected_angebot.webpage
    var descr = selected_angebot.beschreibung
    var tags = selected_angebot.tags
    //
    $('.angebot-name').text(selected_angebot.name)
    $('#navigation li.edit a').attr("href", URL_ANGEBOT_EDIT + selected_angebot.id)
    var html_string = '<span class="label">Angebotsbeschreibung</span><br/>' + descr + '<br/><span class="label">Kontakt:</span> ' + contact
    if (webpage) html_string += '<br/><span class="label">Webseite:</span> <a href="' + webpage + '">' + webpage + '</a><br/>'
    if (tags) {
        if (tags.length > 0) {
            html_string += '<br/><span class="label">Stichworte</span>&nbsp;<br/>'
            var count = 1
            for (var t in tags) {
                var tag = tags[t]
                html_string += '<em>' + tag.label + '</em>'
                if (tags.length > count) html_string += ", "
                count++
            }
        }
    }
    $('.angebot-infos p.body').html(html_string)
    var $links = $('<a href="' + URL_ANGEBOT_DETAIL + selected_angebot.id + '" class="read-more offer-edit">Angebot ansehen</a>&nbsp'
        + '<a href="' + URL_ANGEBOT_EDIT + selected_angebot.id + '" class="read-more offer-edit">Vorlage bearbeiten</a>')
    $('.angebotsinfos .offer-area .links').html($links)
}

function render_assignments_to_edit() {
    // Display Assignments on Assignment Page
    $('.right-side div.einrichtungen').empty()
    if (geo_assignments.length === 0) {
        $('.right-side .help').html('Hinweis:<br/>Diesen Angebotsinformationen sind terminlich noch keine Einrichtungen zugewiesen. Zur Zuweisung w&auml;hlen Sie '
            + 'bitte <b>1.</b> eine <b>Einrichtung</b> und <b>2.</b> einen <b>Angebotszeitraum</b> (linke Seite). Sie k&ouml;nnen vorhandene Angebotszeitr&auml;ume '
            + ' &auml;glich jederzeit wieder bearbeiten.<br/><br/>Bitte nehmen Sie zur Kenntnis das bei ihrer terminlichen Zuweisung von '
            + 'Angebotsinfos die Inhaber_innen des Einrichtungsdatensatzes automatisch &uuml;ber das neue Angebot benachrichtigt werden.')
    } else {
        // $('.help').html('Um einen Zeitraum zu aktualisieren w&auml;hlen Sie diesen bitte aus.')
        $('.right-side .help').empty()
    }
    // ### show address or districts, too
    for (var i in geo_assignments) {
        var obj = geo_assignments[i]
        // var startDate = $.datepicker.formatDate('DD, dd.mm yy', new Date(obj.anfang_timestamp));
        var $element = $('<div id="' + obj.id + '" class="concrete-assignment" '
            + ' title="Zum bearbeiten dieses Zeitraums bitte Klicken"><h3>'
            + obj.name + '</h3><p><i>' + obj.anfang + '</i> &ndash; <i>' + obj.ende + '</i></p></div>')
        $('.right-side div.einrichtungen').append($element)
    }
    // equip all buttons with a click handler each (at once)
    $('.right-side .einrichtungen').on('click', select_assignment)
}

function render_selected_assignment() {
    if (selected_assignment) {
        // render new assignment selection
        $('.concrete-assignment').removeClass('selected')
        $('#' + selected_assignment.id).addClass('selected')
        $('.date-area').removeClass("disabled")
        $('.date-area .einrichtung-name').text(selected_assignment.name) // ### should be geo_name
        $('#from').datepicker("setDate", new Date(selected_assignment.anfang_timestamp))
        $('#to').datepicker("setDate", new Date(selected_assignment.ende_timestamp))
        $('#do-assign .text').text("Zeitraum ändern")
        $('#do-delete').removeClass("hidden")
    } else {
        // clear old assignment rendering
        $('#from').datepicker("setDate", new Date())
        $('#to').datepicker("setDate", new Date())
        // update label
        $('.einrichtung-name').text(selected_geo_object.value)
        // update area
        $('.date-area').removeClass("disabled")
        $('#do-assign .text').text("Speichern")
        $('#do-delete').addClass("hidden")
    }
}

function handle_name_search_input(e) {
    if (e.keyCode === 13) {
        do_search_geo_objects_by_name(render_geo_object_search_results)
    }
}

function select_geo_object(e) {
    var geo_object = restc.get_topic_by_id(e.target.id)
    // update gui state
    selected_geo_object = geo_object
    selected_assignment = undefined
    render_selected_assignment()
}

function select_assignment(event) {
    var element = event.target
    var id = (element.localName === "div") ? element.id : ""
    if (element.localName === "h3" || element.localName === "p") {
        id = element.parentNode.id
    } else if (element.localName === "div") {
        id = element.id
    } else if (element.localName === "i") {
        id = element.parentNode.parentNode.id
    }
    if (id) {
        var assignment = get_assignment(id)
        selected_assignment = assignment
        render_selected_assignment()
    } else {
        console.warn("Could not detect click on Element", element)
    }
}

function get_assignment(assocId) {
    if (!geo_assignments) throw new Error("Client was not initialized correctly, assignments undefined");
    for (var e in geo_assignments) {
        var sel = geo_assignments[e]
        if (sel.id == assocId) return sel // compares DOM id (String) with a Number
    }
    throw new Error("No Assignment for ID: " +  assocId)
}
