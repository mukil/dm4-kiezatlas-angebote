
// ---- Methods to CREATE/UPDATE Screen --- //

var restc       = new RESTClient() // without standard extensions...
var workspace   = undefined

restc.login = function(authorization) {
    this.request("POST", "/accesscontrol/login", undefined, undefined, {"Authorization": authorization}, undefined,
        function() {return false})      // by returning false the error handler prevents the global error handler
}
restc.logout = function() {
    this.request("POST", "/accesscontrol/logout")
}
restc.get_username = function() {
    return this.request("GET", "/accesscontrol/user", undefined, undefined, undefined, "text")
    // Note: response 204 No Content yields to undefined result
}

// --- Angeboute UI Routes

var URL_ANGEBOT_LISTING     = "/angebote/"
var URL_MY_ANGEBOT_LIST     = "/angebote/my"
var URL_ANGEBOT_DETAIL      = "/angebote/edit/"
var URL_ANGEBOT_ASSIGNMENT  = "/angebote/zuordnen/"
var WORKSPACE_COOKIE_NAME   = "dm4_workspace_id"

// --- Angebote Search UI Model -- Client State ---

var location_input = undefined
var location_coords = undefined
var location_radius = 1.5
var available_radiants = [ 0.5, 1.0, 1.5, 2.5, 5.0, 10.0, 15.0 ]
var search_input = undefined
var street_coordinates = []
var street_coords_idx = 0
var time_parameter = undefined


// ----------------------------------  Three Major Search UI Operations ----- //

function do_search_angebote() {
    var queryString = $('#query').val()
    if (queryString.length === 0 && !location_coords) {
        $('#query').attr("placeholder", "Bitte Suchbegriff eingeben").focus()
        return
    }
    $('#search-input-one').addClass('loading')
    var dateTime = new Date().getTime()
    if (time_parameter) { // de-activate time parameter display
        time_parameter = undefined
    }
    var locationValue = undefined
    if (location_coords) { // existing geo-coodinates values have a higher priority
        locationValue = encodeURIComponent(location_coords.longitude.toFixed(4) + ","+ location_coords.latitude.toFixed(4))
    }
    // New text search parameter
    // if (queryString.trim().length < 3) return
    queryString = queryString.replace(/,/g, "") // clean up potential tag delimiter
    search_input = queryString.trim()
    // Existing text search parameter
    var $existingSearchInputParameter = $('.parameter.text .search-value')
    if ($existingSearchInputParameter.length > 0) {
        for (var el in $existingSearchInputParameter) {
            if ($existingSearchInputParameter[el].localName === "span") {
                console.log("Adding Existing Text Search Paramter", $existingSearchInputParameter[el].innerText)
                queryString += "," + $existingSearchInputParameter[el].innerText
            }
        }
    }
    render_query_parameter()
    console.log("Search Query", queryString, "Location", locationValue, "Radius", location_radius, "DateTime", dateTime)
    $.getJSON('/angebote/search?query=' + queryString + '&location=' + locationValue + '&radius='
            + location_radius + '&datetime=' + dateTime, function(results) {
        render_search_results(results)
    })
}

function do_search_streetcoordinates() {
    var locationString = $('#nearby').val().trim()
    $.getJSON('/geoobject/search/coordinates?query=' + encodeURIComponent(locationString), function(results) {
        if (results) {
            street_coordinates = results
            select_locationsearch_parameter()
            do_search_angebote()
        }
    })
}

function do_browser_location() {
    var $loc_status = $('.filter-area .parameter.location')
    if ($loc_status.length === 0) {
        $loc_status = $('<div class="parameter location">Standortermittlung angefragt ...</div>')
        $('.filter-area .query-parameter').append($loc_status)
    } else {
        $loc_status.html('Standortermittlung angefragt...')
    }
    // functionality provided by ka-locating.js script (dm4-kiezatlas-website)
    locating.get_browser_location(function(ok) {
        console.info("Standort OK", ok)
        location_coords = ok.coords
        $loc_status.empty()
        render_query_parameter()
    }, function(error) {
        var reason = "Position unavailable"
        if (error.code === 1) {
            reason = "Permission denied"
            $loc_status.html('<a class="close" href="javascript:remove_location_parameter()">x</a>Wir konnten deinen '
                + 'aktuellen Standort leider nicht automatisch ermitteln (' + reason + ')')
        } else if (error.code === 2) {
            $loc_status.html('<a class="close" href="javascript:remove_location_parameter()">x</a>Wir konnten deinen '
                + 'aktuellen Standort leider nicht automatisch ermitteln (' + reason + ')')
        } else if (error.code === 3) {
            reason = "Timeout"
        } else {
            console.warn("Standortermittlung fehlerhaft", error, reason)
        }
        location_coords = undefined
    }, {
        enableHighAccuracy: true, timeout: 7000, maximumAge: 0
    })
}

function load_tag_view() {
    $.getJSON('/tag/with_related_count/ka2.angebot', function(result) {
        var $tags = $('.tag-view')
        for (var r in result) {
            var tag = result[r]
            var name = tag["value"]
            var tagHTML = '<a href="#stichwort/' + encodeURIComponent(name) +'" id="' + tag.id + '" class="' + tag["view_css_class"] +
                '" title="Finde Angebotsinfos unter dem Stichwort ' + name + '" onclick="handle_tag_selection(this)">' + name + '</a>'
            if (r < result.length - 1) tagHTML += ", "
            $tags.append(tagHTML)
        }
    })
}

function load_current_angebotsinfos() {
    var result = JSON.parse($.ajax('/angebote/filter/' + new Date().getTime(),
        { async: false, dataType: 'json' }).responseText)
    angebotsinfos = result.overall // .timely query results assigned to .overall (server side)
}

// --------------------------- GUI methods for rendering all Search UI elements ------------ //

function show_angebote_frontpage() {
    load_current_angebotsinfos()
    time_parameter = "Heute"
    location_coords = undefined
    search_input = undefined
    render_query_parameter()
    render_search_results()
    load_username(render_user_menu)
    load_tag_view()
}

function render_search_results(items) {
    $('#search-input-one').removeClass('loading')
    var $listing = $('.list-area .results')
    // overall and assigned ### merged
    var items_to_render = { overall: [], assigned: [], timely: []}
    var result_length = 0
    if (items) {
        items_to_render = items
        result_length = items_to_render.overall.length + items_to_render.assigned.length
        $listing.empty()
    } else if (angebotsinfos) {
        items_to_render.timely = angebotsinfos
        result_length = items_to_render.timely.length
    }
    $listing.empty()
    if (items_to_render.length === 0) {
        $listing.append('<li class="read-more">Sie k&ouml;nnen '
            + 'uns helfen neue oder aktuelle Angebote in unsere <a class="create-link" href=\"/sign-up/login\">Datenbank aufzunehmen</a>.</li>')
        // ("+new Date().toLocaleDateString()+")
    }
    // status
    if (items_to_render.overall.length > 0) {
        $('#query').val("")
    }
    // assigned (spatial, time search) list items
    for (var el in items_to_render.timely) {
        var element = items_to_render.timely[el]
        render_timely_list_item(element, $listing)
    }
    // assigned (spatial, time search) list items
    for (var el in items_to_render.assigned) {
        var element = items_to_render.assigned[el]
        render_assigned_list_item(element, $listing)
    }
    // overall (text search listing)
    for (var el in items_to_render.overall) {
        var element = items_to_render.overall[el]
        render_overall_list_item(element, $listing)
    }
    var message = (result_length === 1) ? "1 Angebot" : result_length + " Angebote"
        if (result_length === 0) message = "F&uuml;r diese Suche haben wir leider keine Ergebnisse"
    $('.list-area .status').html(message)
}

function render_timely_list_item(element, $list) {
    var name = element.name
    var contact = element.kontakt
    var html_string = '<li class="read-more"><a href="/angebote/'+element.id+'">'
            + '<div id="' + element.id + '" class="concrete-assignment"><h3 class="angebot-name">'+name+'</h3>'
        if (!is_empty(contact)) html_string += '<span class="contact">Kontakt: ' + contact + '</span>'
        html_string += '<span class="read-more">Mehr..</span>'
        html_string += '</div></a></li>'
    $list.append(html_string)
}

function render_assigned_list_item(element, $list) {
    var locationName = element.name
    var name = element.angebotsName
    var angebotsId = element.angebotsId
    var contact = element.kontakt
    var html_string = '<li class="read-more"><a href="/angebote/'+angebotsId+'">'
            + '<div id="' + angebotsId + '" class="concrete-assignment"><h3 class="angebot-name">'+name+'</h3>'
            + '<p>Wird aktuell in/im <b>' + locationName + '</b> angeboten<br/>'
            + 'Vom <i>'+element.anfang+'</i> bis </i>'+element.ende+'</i>&nbsp;'
        if (!is_empty(contact)) html_string += '<span class="contact">Kontakt: ' + contact + '</span>'
        html_string += '<span class="read-more">Mehr..</span>'
        html_string += '</div></a></li>'
    $list.append(html_string)
}

function render_overall_list_item(element, $list) {
    var name = element.name
    var contact = element.kontakt
    // var webpage = element.webpage
    // var descr = element.beschreibung
    // var tags = element.tags
    var location_count = element.locations.length
    var first_assignment = element.locations[get_random_int_inclusive(1, location_count+1)]
    if (!first_assignment) first_assignment = element.locations[0]
    if (first_assignment) {
        var html_string = '<li class="read-more"><a href="/angebote/'+element.id+'">'
            + '<div id="' + element.id + '" class="concrete-assignment"><h3 class="angebot-name">'+name+'</h3>'
            // html_string += '<p>' + descr + '</p>'
            html_string += '<p>Wird aktuell an ' + location_count + ' Orten angeboten, z.B. <b>' + first_assignment.name + '</b><br/>'
                + 'Vom <i>'+first_assignment.anfang+'</i> bis </i>'+first_assignment.ende+'</i>&nbsp;'
            if (!is_empty(contact)) html_string += '<span class="contact">Kontakt: ' + contact + '</span>'
            // if (!is_empty(webpage)) html_string += '<a href="' + webpage + '">Webseite</a>'
            html_string += '<span class="read-more">Mehr..</span>'
            html_string += '</div></a></li>'
        $list.append(html_string)
    } else {
        console.warn("Could not load assignment for angebotsinfo...", element)
    }
}

// -------------------------------------- Search UI Helper and Utility Methods ------------------- //

function select_locationsearch_parameter(idx) {
    if (street_coordinates.length > 0 && !idx) {
        location_coords = street_coordinates[0]
    } else if (street_coordinates.length > 0 && idx) {
        location_coords = street_coordinates[idx]
        street_coords_idx = idx
    } else {
        location_coords = undefined
        console.log("Clear Location Search Parameter")
    }
    time_parameter = undefined // clear "Heute"
    render_query_parameter()
}

function select_prev_locationsearch_result() {
    prev_idx = street_coords_idx - 1
    if (street_coords_idx === 0) {
        prev_idx = street_coordinates.length - 1
    }
    select_locationsearch_parameter(prev_idx)
}

function select_next_locationsearch_result() {
    next_idx = street_coords_idx + 1
    if (street_coords_idx === street_coordinates.length - 1) {
        next_idx = 0
    }
    select_locationsearch_parameter(next_idx)
}

function toggle_location_parameter_display($filter_area) {
    if (location_coords) {
        var $locationParameter = $('.filter-area .parameter.location')
        var parameterHTML = '<a class="close" title="Standortfilter entfernen" href="javascript:remove_location_parameter()">x</a>'
                + '<select id="nearby-radius" onchange="handle_location_form()" title="Entfernungsangabe für die Umkreissuche">'
        for (var ridx in available_radiants) {
            var option_value = available_radiants[ridx]
            if (location_radius == option_value) {
                parameterHTML += '<option value="'+option_value+'" selected>' + option_value + 'km</option>'
            } else {
                parameterHTML += '<option value="'+option_value+'">' + option_value + 'km</option>'
            }
        }
        parameterHTML += '</select>N&auml;he \"'+ location_coords.name + '\" <span class="coord-values">(' + location_coords.longitude.toFixed(3)
                + ', ' + location_coords.latitude.toFixed(3) + ')</span>'
        if (street_coordinates.length > 1) {
            parameterHTML += '<a class="prev close" title="Alternatives Ergebnis der Standortsuche nutzen" href="javascript:select_prev_locationsearch_result()">&#8592;</a>'
                + '<a class="next close" title="Nächstes Ergebnis der Standortsuche nutzen" href="javascript:select_next_locationsearch_result()">&#8594;</a> '
                + '<span class="alt-count">('+street_coordinates.length +' Standorte gefunden)</span>'
        }
        if ($locationParameter.length === 0) {
            $filter_area.append('<div class="parameter location" title="Standort-Suchfilter">' + parameterHTML + '</div>')
        } else {
            $locationParameter.html(parameterHTML)
        }
    } else {
        $('.filter-area .parameter.location').remove()
    }
}

function toggle_time_parameter_display($filter_area) {
    if (time_parameter) {
        var $timeParameter = $('.filter-area .parameter.time')
        var parameterHTML = '<a class="close" title="Datumsfilter entfernen" href="javascript:remove_time_parameter()">x</a>Heute'
        if ($timeParameter.length === 0) {
            $filter_area.append('<div class="parameter time" title="Zeitfilter der Anfrage">'+parameterHTML+'</div>')
        } else {
            $timeParameter.html(parameterHTML)
        }
    } else {
        $('.filter-area .parameter.time').remove()
    }
}

function toggle_text_parameter_display($filter_area) {
    if (search_input) {
        var className = search_input
        var $parameterExists = $('.filter-area .parameter.text.' + className)
        if ($parameterExists.length === 0) { // dont add the same query term twice)
            $filter_area.append('<div class="parameter text ' + className + '" title="Text Suchfilter">'
                + '<a class="close" title="Textfilter entfernen" onclick="javascript:remove_text_parameter()" href="#">x</a>'
                + 'Suche nach \"<span class="search-value">' + search_input + '</span>\"</div>')
        }
    } else {
        $('.filter-area .parameter.text').remove()
    }
}

function render_query_parameter() {
    var $filter_area = $('.query-parameter')
    //
    toggle_location_parameter_display($filter_area)
    //
    toggle_time_parameter_display($filter_area)
    //
    toggle_text_parameter_display($filter_area)
    //
    if (!search_input && !location_coords && !time_parameter) {
        $('.list-area .status').html("Bitte gib einen Suchbegriff ein oder w&auml;hle einen Standort")
    }
}

function remove_location_parameter() {
    location_coords = undefined
    render_query_parameter()
    // do_search_angebote()
}

function remove_time_parameter() {
    time_parameter = undefined
    render_query_parameter()
    // do_search_angebote()
}

function remove_text_parameter(e) {
    search_input = undefined
    $('#query').val("")
    render_query_parameter()
    // do_search_angebote()
}

function handle_tag_selection(e) {
    var tagname = e.text
    remove_text_parameter()
    remove_time_parameter()
    $('#query').val(tagname)
    do_search_angebote()
}

function handle_fulltext_form(e) {
    console.log("Supressing Fulltext Search Action", e)
}

function handle_location_form(e) {
    var radiusSelection = document.getElementById("nearby-radius");
    if (radiusSelection) {
        location_radius = radiusSelection.options[radiusSelection.selectedIndex].value;
        console.log("Updated Location Search Radius", location_radius)
        do_search_angebote()
    }
}

// -------------------------------------- Custom Angebote JS Client (Edit, Show, Assign) --------------- //

function do_save_angebot() {
    // Read in new values
    var name = $('#angebot-name').val().trim()
    // get HTML for angebot beschreibung
    var descr = CKEDITOR.instances["angebot-beschreibung"].getData()
    // parse contact value
    var contact = $('#angebot-kontakt').val().trim()
    // .. and webpage / URL input
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
    } else {
        // Create
        // ### do not allow for empty name, empty description or empty contact
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
        console.log("Saving Angebot Topic: " + topic_model)
        topic = restc.create_topic(topic_model)
    }
    clear_angebot_form_area()
    // ### display "Eingaben gesichert!"
    go_to_angebot_assignment(topic.id)
}

function clear_angebot_form_area() {
    $('.form-area.angebot').attr("id", -1)
    $('#angebot-name').val('')
    CKEDITOR.instances["angebot-beschreibung"].setData('')
    $('#angebot-kontakt').val('')
    $('#angebot-webpage').val('')
    $('#angebot-tags').val('')
}

function clear_assignment_date_area() {
    $('#from').val('')
    $('#to').val('')
    $('.date-area .einrichtung-name').text('...')
    $('.date-area').addClass("disabled")
    $('#do-assign').attr("value", "Speichern")
    $('#do-delete').addClass("hidden")
}

function load_users_angebote() {
    var result = restc.request("GET", "/angebote/my")
    for (var el in result) {
        var item = result[el]
        var created_val = new Date(item['childs']['dm4.time.created']['value'])
        var modified_val = new Date(item['childs']['dm4.time.modified']['value'])
        var created = $.datepicker.formatDate("dd. MM yy", created_val)
        var modified = $.datepicker.formatDate("dd. MM yy", modified_val)
        // console.log("Angebot Item", item, created, modified)
        $('ul.angebote').append('<li id="'+item.id+'">' + item.value + '<a href="/angebote/edit/'
            + item.id + '">Infos bearbeiten</a><a href="/angebote/zuordnen/'
            + item.id + '">Termine anpassen</a><br/><small>Erstellt am '
            + created + ', zuletzt bearbeitet am '+ modified + '</small></li>')
    }
}

/** function load_angebot(id) {
    var topic = restc.request("GET", "/kiezatlas/angebot/" + id)
    selected_angebot = topic
    console.log("Angebotsinformation", topic)
} **/

// ---- Methods used for ASSIGNMENT screen (angebote to a geo object) --- //

var selected_angebot,
    selected_assignment,
    selected_geo_object,
    geo_assignments,
    angebotsinfos

function render_assignment_page() {
    load_angebot_by_resource_path()
    init_datepicker()
    render_angebot_header_info()
    load_assignments(render_assignments)
}

var fromDate,
    toDate

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

function do_delete_assignment() {
    // Do Delete
    restc.request("POST", "/angebote/assignment/" +selected_assignment.id + "/delete")
    selected_assignment = undefined
    selected_geo_object = undefined
    // refresh GUI
    clear_assignment_date_area()
    render_assignment_page()
}

function do_save_assignment(e) {
    // ### fixme: firefox can not parse german localized date strin
    // ### notify user when an assignment already exists..
    // ### Insert default values to initialize if not specified
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
    clear_assignment_date_area()
    render_assignment_page()
}

// ----- List and Edit existing Assignments (of Angebote to Geo Objects) -----


function load_assignments(renderer) {
    $.ajax({
        type: "GET", url: "/angebote/list/assignments/" + selected_angebot.id,
        success: function(response) {
            if (response) {
                geo_assignments = response
                console.log("Loaded Angebot Geo Assignments ", geo_assignments)
                if (renderer) renderer(response)
            }
        },
        error: function(x, s, e) {
            geo_assignments = []
            console.warn("ERROR", "x: ",x, " s: ", s," e: ", e)
        }
    })
}

function load_assignments(renderer) {
    $.ajax({
        type: "GET", url: "/angebote/list/assignments/" + selected_angebot.id,
        success: function(response) {
            if (response) {
                geo_assignments = response
                console.log("Loaded Angebot Geo Assignments For User", geo_assignments)
                if (renderer) renderer(response)
            } else {
                $('#user').html('Bitte <a href="/sign-up/login">loggen</a> sie sich ein um Zuordnungen zu bearbeiten.')
                $('.task-info').addClass('disabled')
                $('div.angebot-area').addClass('disabled')
                geo_assignments = []
            }
        },
        error: function(x, s, e) {
            geo_assignments = []
            console.warn("ERROR", "x: ",x, " s: ", s," e: ", e)
        }
    })
}

// -------------------------- GUI Methods for Angebote Assignment and Editing ------------------- //

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
}

function render_angebot_header_info() {
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
    $('#navigation li.edit a').attr("href", "/angebote/edit/" + selected_angebot.id)
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
        html_string += '<br/><a href="/angebote/edit/' + selected_angebot.id + '" class="read-more offer-edit">Angebot bearbeiten</a>'
    $('.angebot-infos p.body').html(html_string)
}

function render_assignments() {
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
        $('#do-assign').attr("value", "Zeitraum ändern")
        $('#do-delete').removeClass("hidden")
    } else {
        // clear old assignment rendering
        $('#from').datepicker("setDate", new Date())
        $('#to').datepicker("setDate", new Date())
        // update label
        $('.einrichtung-name').text(selected_geo_object.value)
        // update area
        $('.date-area').removeClass("disabled")
        $('#do-assign').attr("value", "Speichern")
        $('#do-delete').addClass("hidden")
    }
}

function render_angebot_locations() {
    // Display Assignments
    var $einrichtungen = $('.geo-objects-area .einrichtungen')
        $einrichtungen.empty()
        // $einrichtungen.html('<b>Hello fucked up World!</b>')
    if (geo_assignments.length === 0) {
        $('.help').html('Diesen Angebotsinfos sind aktuell noch keine Angebotszeitr&auml;ume in Einrichtungen zugewiesen.')
    } else {
        // $('.help').html('Um einen Zeitraum zu aktualisieren w&auml;hlen Sie diesen bitte aus.')
    }
    // ### show address or districts, too
    for (var i in geo_assignments) {
        var obj = geo_assignments[i]
        // var startDate = $.datepicker.formatDate('DD, dd.mm yy', new Date(obj.anfang_timestamp));
        var $element = $('<a class="read-more" href="/geoobject/'+obj.locationId // ### adjust url for deployment
                +'"><div id="' + obj.id + '" class="concrete-assignment"><h3>'
                + obj.name + '</h3><p>'+obj.address+'<br/><i>' + obj.anfang + '</i> &ndash; <i>' + obj.ende + '</i></p></div></a>')
        $einrichtungen.append($element)
    }
    // equip all buttons with a click handler each (at once)
    // $einrichtungen.on('click', select_assignment)
}

function handle_name_search_input(e) {
    if (e.keyCode === 13) {
        search_geo_objects_by_name(show_geo_object_search_results)
    }
}

function search_geo_objects_by_name(renderer) { // usually calls show_geo_object_search_results
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

function show_geo_object_search_results(results) {
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

// -------------------------------- Displaying Angebotsinfos in DETAIL and LIST

var selected_assignment = undefined

function do_revise_assignment() {
    var username = restc.get_username()
    if (username) {
        var hasAngeboteMembership = $.ajax('/angebote/membership/', { async: false, dataType: 'json' }).responseText
        if (hasAngeboteMembership) {
            do_revise_call()
        } else {
            alert("Entschuldigung, bei der Aufhebung der Zuweisung ist ein Fehler aufgetreten. Wir konnten Sie nicht autorisieren.")
        }
    } else {
        do_privileged_revise_call()
    }

    function do_revise_call() {
        var result = restc.request('POST', '/angebote/assignment/' + selected_assignment.id + "/delete")
        console.log("Do Revise Call", result)
        $('.label.hint').text("OK, die Zuweisung dieses Angebots wurde erfolgreich aufgehoben.")
    }

    function do_privileged_revise_call() {
        restc.login("Basic " + btoa("angebote-ui:my-secret-password"))
        username = restc.get_username()
        if (username) {
            do_revise_call()
            restc.logout()
            window.document.location.assign("/")
            go_to_frontpage()
        } else {
            $('.label.hint').text("Entschuldigung, bei der Aufhebung der Zuweisung ist ein Fehler aufgetreten.")
        }
    }
}

function render_angebotsrevise_page() {
    var assocId = parse_angebots_id()
    selected_assignment = JSON.parse($.ajax('/angebote/assignment/' + assocId, { async: false, dataType: 'json' }).responseText)
    $('.einrichtungs-name').text(selected_assignment.name)
    $('.angebots-name').text(selected_assignment.angebotsName)
    $('.von').text(selected_assignment.anfang)
    $('.bis').text(selected_assignment.ende)
    $('.angebots-beschreibung').html(selected_assignment.beschreibung)
    $('.kontakt').html(selected_assignment.kontakt)
    $('.webpage').attr("href", selected_assignment.webpage).text(selected_assignment.webpage)
}

function render_angebotsinfo_page() {
    load_angebot_by_resource_path(function(status, selected_angebot) {
        if (status === "ok") {
            render_angebot_detail_area()
        } else if( status === "error") {
            alert("Error Rendering Selected Angebotsinfo", selected_angebot)
            // render_angebot_detail_area()
        }
    })
    load_assignments(render_angebot_locations)
    load_username(render_user_menu)
}

function render_angebot_detail_area() {
   console.log("Show Angebotinfo Details Page", selected_angebot)
   if (!selected_angebot) throw new Error("Angebotsinfo not found")
    // assemble Angebotsinfo
    var name = (selected_angebot.name) ? selected_angebot.name : "Name des Angebots"
    var contact = (selected_angebot.kontakt) ? selected_angebot.kontakt : "Kontakt"
    var webpage = (selected_angebot.webpage) ? selected_angebot.webpage : "Webpage"
    var descr = (selected_angebot.beschreibung) ? selected_angebot.beschreibung : "Beschreibung"
    var tags = "" // ### render tags
    for (var t in selected_angebot.tags) {
        tags += selected_angebot.tags[t].label
        if (t < selected_angebot.tags.length - 1) tags += ", "
    }
    // append to DOM
    $('.angebot-name').text(name)
    $('.angebot-infos p.body').html('<span class="label">Angebotsinfos</span><br/>'
            + descr + '<br/><span class="label">Kontakt</span><br/>' + contact
            + '<br/><br/><span class="label">Webseite</span><br/><a href="' + webpage + '">'
            + webpage + '</a><br/><br/><span class="label">Stichworte</span><br/><i>' + tags + '</i>')
}

function load_angebot_by_resource_path(callback) {
    var angebot_id = parse_angebots_id()
    var angebotsinfoText = $.ajax('/angebote/' + angebot_id, { async: false, dataType: 'json' }).responseText
    try {
        selected_angebot = JSON.parse(angebotsinfoText)
        if (callback) callback("ok", selected_angebot)
    } catch (e) {
        console.warn("Could not load angebotsinfo details...", e, "using", angebotsinfoText)
        selected_angebot = angebotsinfoText
        if (callback) callback("error", selected_angebot)
    }
}

// ---- Generic Methods used ACROSS all screens ---- //

function load_username(renderer) {
    $.ajax({
        type: "GET", url: "/accesscontrol/user",
        success: function(obj) {
            if (renderer) renderer(obj)
        },
        error: function(x, s, e) {
            console.warn("ERROR", "x: " + x + " s: " + s + " e: " + e)
        }
    })
}

function render_user_menu(state) {
    console.log("Rendering User Menu (Angebote UI)", state)
    // ### Show Administration Menu for "Confirmation" WS Members
    // $('.menu.administration').attr('style', 'display: inline-block;')
    if (state) {
        $('.menu .login.item').hide()
        $('.menu .register.item').hide()
        $('.menu .angebote.item').attr('style', 'display: inline-block;')
        $('.menu .create.item').attr('style', 'display: inline-block;')
        $('.menu .logout.item').attr('style', 'display: inline-block;')
    } else {
        $('.menu .login.item').show()
        $('.menu .create.item').hide()
        $('.menu.administration').hide()
        $('.menu .angebote.item').hide()
        $('.menu .logout.item').hide()
        $('#user').html('Bitte <a href="/sign-up/login">loggen</a> sie sich ein um Angebote zu bearbeiten.')
        $('.task-info').addClass('disabled')
        $('div.angebot-area').addClass('disabled')
    }
}

function fetch_angebote_workspace() {
    var angebote_workspace_uri = "de.kiezatlas.angebote_ws"
    $.getJSON('/core/topic/by_value/uri/' + angebote_workspace_uri, function(result){
        js.remove_cookie(WORKSPACE_COOKIE_NAME)
        js.set_cookie(WORKSPACE_COOKIE_NAME, result.id)
        console.log("Set Angebote Workspace Cookie", result.id)
    })
}

function has_angebote_membership(callback) {
    // var angebote_workspace_uri = "de.kiezatlas.angebote_ws"
    $.getJSON('/angebote/membership/', function(response) {
        if (!response) {
            if (callback) callback(false)
        } else {
            if (callback) callback(true)
        }
    })
}

function go_to_angebot_assignment(id) {
    if (id) {
        window.document.location.assign(URL_ANGEBOT_ASSIGNMENT + id)
    } else {
        setTimeout(function(e) {
            go_to_my_angebot_listing()
        }, 1500)
    }
}

function go_to_my_angebot_listing() {
    window.document.location.assign(URL_MY_ANGEBOT_LIST)
}


function is_empty(stringValue) {
    return (stringValue === "" || stringValue === " ")
}

function get_random_int_inclusive(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function autocorrect_url(current_url) {
    if (current_url.length <= 4) return true
    var PROTOCOL_START = "http"
    if (!current_url.startsWith("http")) {
        $('#angebot-webpage').val(PROTOCOL_START + '://' + current_url)
        console.log('Wir haben ein HTTP hinzugef&uuml;gt', current_url)
    }
    return is_valid_url(current_url)

    function is_valid_url(url) {
        var parser = document.createElement('a')
        try {
            parser.href = url
            return (parser.hostname !== "localhost" && !!parser.hostname)
        } catch (e) {
            return false
        }
    }
}

function parse_angebots_id() {
    var start = window.document.location.pathname.lastIndexOf("/")
    var topicId = window.document.location.pathname.substr(start+1)
    return topicId
}

// ---- Kiezatlas 2 Website Script Copy ----

function logout() {
    $.post('/accesscontrol/logout', function(username) {
        if (!username) render_user_menu(false)
    })
}

// ---- Initialize script

fetch_angebote_workspace()
