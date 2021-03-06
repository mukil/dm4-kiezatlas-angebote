
// -------------------------------------- Custom Angebote JS Client (Edit, Show, Assign) --------------- //

function do_save_angebot_and_go_assign() {
    var topic = do_save_angebot()
    if (topic && topic.id !== -1) {
        window.document.location.assign(URL_ANGEBOT_ASSIGNMENT + topic.id)
    } else {
        var resource = $('#assignment-link').attr("data-my-href")
        window.document.location.assign(resource)
    }
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

function render_user_assignment_page(topicId) {
    if (topicId) {
        load_user_place_assignments(topicId, render_user_assignments, false)
    } else {
        console.error("Cannot load user assignments for undefined geo object")
    }
    // init_datepicker()
}

// ---- Methods used for ASSIGNMENT screen (angebote to a geo object) --- //

function render_assignment_page() {
    load_angebot_by_resource_path(parse_angebots_id(), function() {
        render_angebot_shortinfo()
        load_angebote_places_and_dates(render_assignments_listing, false)
    })
    init_datepicker()
}

function clear_assignment_dateform() {
    $('#from').val('')
    $('#to').val('')
    $('.date-area .einrichtung-name').text('...')
    $('.date-area').addClass("disabled")
    $('#do-assign .text').text("Speichern")
    $('#do-delete').addClass("hidden")
    $('#additional-details').val('')
    $('#additional-kontakt').val('')
}

function init_datepicker() {
    // jQuery UI Datepicker Widget with German Local Dependency
    $.datepicker.setDefaults($.datepicker.regional["de"])
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
    // ### notify user when an assignment already exists..
    show_saving_icon('#update-assignment icon')
    var fromInput = $('input#from').val()
    var toInput = $('input#to').val()
    var additionalInfo = $('#additional-details').val()
    var additionalContact = $('#additional-kontakt').val()
    var fromDate = -1
    var toDate = -1
    var fromInputDate = { year: 0, month: 0, day: 0 }
    var toInputDate = { year: 0, month: 0, day: 0 }
    // parse dates
    if (fromInput.length > 0) {
        console.log("Datepicker FROM Input", fromInput)
        fromInput = remove_weekday_label(fromInput)
        fromInput = remove_dots(fromInput)
        fromInput = remove_commas(fromInput)
        fromInput = convert_to_en_month(fromInput)
        var fromInputSplit = fromInput.trim().split(" ")
        fromInputDate.day = fromInputSplit[0]
        fromInputDate.month = get_month_from_en(fromInputSplit[1])
        fromInputDate.year = fromInputSplit[2]
        // fromInput = fromInput + " " + TIMEZONE_SUFFIX
        // Note: we always shift time forwad (into the next day) about approx. 1sec
        // fromDate = (new Date(fromInput).getTime() + 1000)
        fromDate = (new Date(fromInputDate.year, fromInputDate.month, fromInputDate.day).getTime() + 1000)
        console.log("Parsed to FROM DATE", fromDate, fromInputSplit)
    }
    /** var oneDayValue = get_oneday_checkbox_value()
    if (oneDayValue) {
        console.log("   We could skip the From Date here..", oneDayValue)
    } **/
    if (toInput.length > 0) {
        console.log("Datepicker TO Input", toInput)
        toInput = remove_weekday_label(toInput)
        toInput = remove_dots(toInput)
        toInput = remove_commas(toInput)
        toInput = convert_to_en_month(toInput)
        var toInputSplit = toInput.trim().split(" ")
        toInputDate.day = toInputSplit[0]
        toInputDate.month = get_month_from_en(toInputSplit[1])
        toInputDate.year = toInputSplit[2]
        // toInput = toInput + " " + TIMEZONE_SUFFIX
        // console.log("Cleaned up TO dateString", toInput, toInputSplit)
        // Note: we always shift time one hour and 1 sec back to (nearly) the end of the selected day
        // toDate = (new Date(toInput).getTime() + (86400000 - 3601000))
        toDate = (new Date(toInputDate.year, toInputDate.month, toInputDate.day).getTime() + (86400000 - 3601000))
        console.log("Parsed to TO DATE", toDate)
    }
    // console.log("Shifted Datepicker delivered us FROM", fromInput, fromDate, "TO", toInput, toDate)
    if (!selected_angebot) throw new Error("Assertion failed: An angebot must be loaded before an assignment can be created.")
    // Update assignment assoc
    if (selected_assignment_infos && (fromDate != selected_assignment_infos.von || toDate != selected_assignment_infos.bis)) {
        var assocModel = { childs: {} }
        if (additionalContact) {
            assocModel.childs["ka2.angebot.assignment_kontakt"] = additionalContact.trim()
        }
        if (additionalInfo) {
            assocModel.childs["ka2.angebot.assignment_zusatz"] = additionalInfo.trim()
        }
        restc.request("PUT", "/angebote/assignment/" +selected_assignment_infos.id + "/" + fromDate + "/" + toDate, assocModel)
        console.log("Dates Changed - Update Assignment From:", fromDate, selected_assignment_infos.name, "To:", toDate)
    } else {
        // Create assignment assoc
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
            },
            childs: {}
        }
        if (additionalContact) {
            assocModel.childs["ka2.angebot.assignment_kontakt"] = additionalContact.trim()
        }
        if (additionalInfo) {
            assocModel.childs["ka2.angebot.assignment_zusatz"] = additionalInfo.trim()
        }
        restc.request("POST", "/angebote/assignment/" + fromDate + "/" + toDate, assocModel)
    }
    // refresh GUI
    selected_assignment_infos = undefined
    selected_geo_object = undefined
    // refresh GUI
    clear_assignment_dateform()
    hide_saving_icon('#update-assignment icon')
    render_assignment_page()
}

function do_delete_assignment() {
    $("#dialog-confirm").dialog({ resizable: false, height: "auto", width: 340, modal: true,
        title: "Angebotszeitraum löschen", buttons: {
            "Ja, löschen": function() {
                // Do Delete
                if (selected_assignment_infos) {
                    restc.request("POST", "/angebote/assignment/" +selected_assignment_infos.id + "/delete")
                    selected_assignment_infos = undefined
                    selected_geo_object = undefined
                } else {
                    alert("Could not delete assignment, please select it and try again.")
                }
                // refresh GUI
                clear_assignment_dateform()
                render_assignment_page()
                $( this ).dialog( "close" );
            },
            "Nein, danke": function() {
                $( this ).dialog( "close" );
            }
        }
    })
}

// -------------------------- GUI Methods for Angebote Assignment and Editing ------------------- //

var districtId = undefined

function do_submit_search_form() {
    do_fulltext_geo_object_search(render_geo_object_search_results)
}

function do_fulltext_geo_object_search(renderer) { // usually calls show_geo_object_search_results
    var queryString = $("#name-search").val()
    queryString = encodeURIComponent(queryString, "UTF-8")
    if (queryString.length === 0) {
        $("#name-search").attr("placeholder", "Bitte geben Sie einen Ortsnamen ein")
        $("#name-search").focus()
    }
    do_form_text_query_expansion(queryString)
    // ### hacking message display
    var searchResource = "/website/search?search="
    var queryHash = queryString
    if (districtId) {
        // console.log("Search could make use of district filter", districtId)
        searchResource = "/website/search/" + districtId + "?search="
        queryHash += ";bezirk=" + districtId
        var selection = document.getElementById('district-filter')
        var districtName = selection.options[selection.selectedIndex].text
        $('.form-area div.einrichtungen').html("Suche nach Orten in Bezirk " + districtName + " gestartet ...")
    } else {
        $('.form-area div.einrichtungen').html("Berlinweite Suche nach Orten gestartet ...")
    }
    $.ajax({
        type: "GET", url: searchResource + queryString,
        success: function(obj) {
            renderer(obj)
        },
        error: function(x, s, e) {
            throw Error ("ERROR", "x: " + x + " s: " + s + " e: " + e)
        }
    })
    return queryHash
}

function do_form_text_query_expansion(val) {
    var query = val
    var streetNameResource = "/website/search/name/street?name=" + encodeURIComponent(query)
    // var bezirksregionNameResource = "/website/search/name/region?name=" + encodeURIComponent(query)
    $.getJSON(streetNameResource, function (addresses) {
        console.log(addresses.length, "Addresses found", addresses)
        if (addresses.length > 0) {
            var streetNames = '<div class="street-hint">Stattdessen suchen nach Einrichtungen mit '
            streetNames += '<span class="parameter" onclick="do_form_street_query(this)">' + query +'</span> als Adresse?'
            streetNames += '</div>'
            $('.search-info').empty()
            $('.search-info').append(streetNames)
        }
    })
    /** $.getJSON(bezirksregionNameResource, function (bezirksregionen) {
        console.log(bezirksregionen.length, "Bezirksregionen identified", bezirksregionen, "for bezirksregion name query " + query)
    }) **/
}

function do_form_street_query(el) {
    var streetNameResource = "/website/search/street?name=" + encodeURIComponent(el.innerText)
    $.getJSON(streetNameResource, function (geo_objects) {
        render_geo_object_search_results(geo_objects)
    })
}

function set_search_district_filter() {
    var $selection = $('#district-filter')
    districtId = $selection.val()
    if (districtId === "none") {
        districtId = undefined
    }
    do_fulltext_geo_object_search(render_geo_object_search_results)
}

function render_geo_object_search_results(results) {
    $('.form-area div.einrichtungen').empty()
    for (var i in results) {
        var obj = results[i]
        if (obj) {
            var $element = $('<div class="result-item"><label title="Auswahl der Orte im Bezirk ' + obj.bezirk_name + '" for="'+obj.id+'">'
                    + '<input type="radio" title="Auswahl der Orte im Bezirk ' + obj.bezirk_name + '" name="group" id="' + obj.id+ '" value="geo-'+obj.id+'">'
                    + obj.name + ', <span class="label">' + obj.anschrift + '</span></label></div>')
            $('.form-area div.einrichtungen').append($element)
        } else {
            console.warn("Error during rendering Geo Objects Assignment", obj)
        }
    }
    if (results.length === 0 && URL_EINRICHTUNG_CREATE) {
        $('.form-area div.einrichtungen').append('<div>Haben Sie den gew&uuml;nschten Ort nicht finden k&ouml;nnen? Dann k&ouml;nnen '
            + 'Sie es entweder mit einer leicht ver&auml;nderten Suchanfrage erneut versuchen oder '
            + 'bitte einmalig den gesuchten, <a href="' + URL_EINRICHTUNG_CREATE + '">neuen Ort anlegen</a>.</div>')
    } else {
        $('.form-area .search-info').text(results.length + " Suchergebnisse.")
        $('.form-area .search-hint').show()
    }
    // equip all buttons with a click handler each (at once)
    $('input[name=group]').on('click', select_geo_object)
}

function render_angebot_shortinfo() {
    if (!selected_angebot || !selected_angebot.hasOwnProperty("id")) {
       console.log("No Angebot (With ID) selected, loaded", selected_angebot)
       return
    }
    $('.angebot-name').text('"' + selected_angebot.name + '" ')
    $('#navigation li.edit a').attr("href", URL_ANGEBOT_EDIT + selected_angebot.id)
    var html_string = selected_angebot.beschreibung + '<br/>'
        + '<span class="label">Kontakt:</span> ' + selected_angebot.kontakt
    $('.angebot-infos p.body').html(html_string)
    var $links = $('<a href="' + URL_ANGEBOT_DETAIL + selected_angebot.id + '" class="read-more offer-edit">Infos ansehen</a>&nbsp'
        + '<a href="' + URL_ANGEBOT_EDIT + selected_angebot.id + '" class="read-more offer-edit">Vorlage bearbeiten</a>')
    $('.angebotsinfos .offer-area .links').html($links)
}

function render_assignments_listing() {
    // Display Assignments on Assignment Page
    $('.right-side div.einrichtungen').empty()
    if (geo_assignments.length === 0) {
        $('.right-side .help').html('<p>Dieses Angebot ist aktuell noch keinem Veranstaltungsort zugewiesen. Zur Veröffentlichung geben Sie '
            + 'bitte</p><ol><li> einen Ort (über das Suchfeld links) und</li><li>f&uuml;r diesen einen Angebotszeitraum (Datum, Von - Bis) an.</li></ol><p>Sie k&ouml;nnen Angebotszeitr&auml;ume '
            + ' nachtr&auml;glich jederzeit ändern und das Angebot auch mehreren Orten zuweisen. Mit dem anlegen eines Angebotszeitraums wird ihre Angebotsinfo im Kiezatlas öffentlich und ist für Besucher_innen z.B.: über die <a href="/angebote">Angebotssuche</a> auffindbar.</p>'
            + ' <p>Unser/e Ansprechpartner_in für den jeweiligen Veranstaltungsort wird von uns über neue Angebotszeiträume benachrichtigt und hat die Möglichkeit Sie zu kontaktieren und ggf. das Angebot zu revidieren.</p>')
    } else {
        // $('.help').html('Um einen Zeitraum zu aktualisieren w&auml;hlen Sie diesen bitte aus.')
        $('.right-side .help').empty()
    }
    // ### show address or districts, too
    for (var i in geo_assignments) {
        var obj = geo_assignments[i]
        var zusatzinfo = (obj.hasOwnProperty("zusatzinfo")) ? '<span class="label">Zusatz: </span> ' + obj.zusatzinfo + '<br/>' : ''
        var kontaktVorOrt = (obj.hasOwnProperty("kontakt")) ? '<span class="label">Kontakt vor Ort: </span> ' + obj.kontakt : ''
        // var startDate = $.datepicker.formatDate('DD, dd.mm yy', new Date(obj.anfang_timestamp));
        var $element = $('<div id="' + obj.id + '" class="concrete-assignment" '
            + ' title="Zum bearbeiten dieses Zeitraums bitte Klicken"><h3>'
            + obj.name + '</h3><p><i>' + obj.anfang + '</i> &ndash; <i>' + obj.ende + '</i></p>'
            + '<p>' + zusatzinfo + kontaktVorOrt + '</p>'
            + '</div>')
        $('.right-side div.einrichtungen').append($element)
    }
    // equip all buttons with a click handler each (at once)
    $('.right-side .einrichtungen').on('click', select_assignment)
}

function render_assignment_form() {
    // console.log("Selected Assignment", selected_assignment_infos, "Edge", selected_assignment_edge)
    if (selected_assignment_infos) {
        // render new assignment selection
        $('.concrete-assignment').removeClass('selected')
        $('#' + selected_assignment_infos.id).addClass('selected')
        $('.date-area').removeClass("disabled")
        render_assignment_place_name(selected_assignment_infos.name)
        $('#from').datepicker("setDate", new Date(selected_assignment_infos.anfang_timestamp))
        $('#to').datepicker("setDate", new Date(selected_assignment_infos.ende_timestamp))
        $('.date-area .edit-info').text("Zeitraum bearbeiten")
        $('#do-assign .text').text("Zeitraum ändern")
        $('#do-delete').removeClass("hidden")
        // load additional override infos (per location) stored on the edge
        var additionalContact = undefined
        var additionalInfo = undefined
        if (selected_assignment_edge.childs.hasOwnProperty("ka2.angebot.assignment_kontakt")) {
            additionalContact = selected_assignment_edge.childs["ka2.angebot.assignment_kontakt"].value
            $('#additional-kontakt').val(additionalContact)
        } else {
            $('#additional-kontakt').val('')
        }
        if (selected_assignment_edge.childs.hasOwnProperty("ka2.angebot.assignment_zusatz")) {
            additionalInfo = selected_assignment_edge.childs["ka2.angebot.assignment_zusatz"].value
            $('#additional-details').val(additionalInfo)
        } else {
            $('#additional-details').val('')
        }
    } else {
        // clear old assignment rendering
        $('#from').datepicker("setDate", new Date())
        $('#to').datepicker("setDate", new Date())
        // update area
        $('.date-area').removeClass("disabled")
        $('#do-assign .text').text("Speichern")
        $('#do-delete').addClass("hidden")
        $('#do-override').removeClass('hidden')
        $('#additional-details').val('')
        $('#additional-kontakt').val('')
    }
}

function show_override_details_form() {
    $('#do-assign .text').html("Aktualisieren")
    $('#do-delete .text').html("Zuweisung l&ouml;schen")
}

function handle_oneday_assignment() {
    var $elements = $('#do-oneday')
    var checkbox = $elements[0]
    console.log("Clicked 1Day Tick", $elements, checkbox)
    /** if (checked) {
        $('#to-form-block').show()
    } else {
        $('#to-form-block').hide()
    } **/
    $('#to-form-block').toggle()
}

function get_oneday_checkbox_value() {
    var val = $('#do-oneday')[0].attr("checked")
    console.log("1-Tag Checkbox Value", val)
}

function do_street_query(el) {
    var streetNameResource = "/website/search/street?name=" + encodeURIComponent(el.innerText)
    $.getJSON(streetNameResource, function (geo_objects) {
        var $container = $('.result-list .container')
        $container.empty()
        if (geo_objects.length > 0) {
            results = geo_objects
            console.log("Render search results", results)
            render_place_fulltext_search_results(0, geo_objects.length, geo_objects.length, $container)
            hide_search_loading_sign()
            show_results_container()
        }
    })
}

function select_geo_object(e) {
    // 1) selecting assigned username topic
    if (window.document.location.href.indexOf("ansprechpartner") !== -1) {
        list.show_assigned_usernames(e.target.id) // calls function in 'ka-admin.js' module (dm4-kiezatlas-website)
    } else {
        // 2) selecting assigned angebote topic
        var geo_object = restc.get_topic_by_id(e.target.id)
        // update gui state
        selected_geo_object = geo_object
        selected_assignment_infos = undefined
        clear_assignment_dateform()
        render_assignment_form()
        render_assignment_place_name(selected_geo_object.value)
    }
}

function render_assignment_place_name(name) {
    $('.date-area .einrichtung-name').text(name)
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
        selected_assignment_infos = get_assignment_edge(id)
        selected_assignment_edge = restc.get_association_by_id(id, true) // include children=True
        render_assignment_form()
    } else {
        throw Error("Could not detect click on Element")
        console.warn("Could not detect click on Element", element, event)
    }
}

function get_assignment_edge(assocId) {
    if (!geo_assignments) throw new Error("Client was not initialized correctly, assignments undefined");
    for (var e in geo_assignments) {
        var sel = geo_assignments[e]
        if (sel.id == assocId) return sel // compares DOM id (String) with a Number
    }
    throw Error("No Assignment for ID: " +  assocId)
}
