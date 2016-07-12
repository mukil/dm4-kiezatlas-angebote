
// ---- Methods to CREATE/UPDATE Screen --- //

var restc       = new RESTClient()
var workspace   = undefined

// --- Angebote Search UI Model -- Client State ---

var location_input = undefined
var location_coords = undefined
var location_radius = 0
var search_input = undefined
var street_coordinates = []

// --- Angeboute UI Routes

var URL_ANGEBOT_LISTING     = "/angebote/"
var URL_MY_ANGEBOT_LIST     = "/angebote/my"
var URL_ANGEBOT_DETAIL      = "/angebote/edit/"
var URL_ANGEBOT_ASSIGNMENT  = "/angebote/zuordnen/"
var WORKSPACE_COOKIE_NAME   = "dm4_workspace_id"

function do_search_angebote() {
    var queryString = $('#query').val()
    var locationString = $('#nearby').val()
    var dateNow = new Date()
    if (locationString === "" && queryString !== "") {
        // console.log("No spatial parameter added to fulltext search.. \"", queryString, "\"", dateNow)
    } else if (locationString !== "" && queryString !== "") {
        // console.log("Fulltext search parameter", queryString, "with spatial parameter", locationString, dateNow)
        location_input = locationString
    } else if (locationString !== "" && queryString === "") {
        // console.log("Just a spatial search for angebote", locationString, dateNow)
        location_input = locationString
    } else {
        // console.log("No query terms entered into search form..")
    }
    if (location_coords) { // existing geo-coodinates values have a higher priority
        locationString = encodeURIComponent(location_coords.longitude.toFixed(4) + ","+ location_coords.latitude.toFixed(4))
    }
    search_input = queryString.trim()
    render_query_parameter()
    $.getJSON('/angebote/search?query=' + queryString + '&location=' + locationString + '&radius='
            + location_radius + '&datetime=' + dateNow.getTime(), function(results) {
        console.log("Fetched fulltext search results", results)
        render_current_angebots_listing(results)
    })
}

function do_search_streetcoordinates() {
    var locationString = $('#nearby').val().trim()
    $.getJSON('/geoobject/search/coordinates?query=' + encodeURIComponent(locationString), function(results) {
        console.log("Loaded Street Coordinates", results)
        street_coordinates = results
    })
}

function do_browser_location() {
    var $loc_status = $('.geo-locating')
    // gui
    if ($loc_status.length === 0) {
        $loc_status = $('<div class="geo-locating">Standortermittlung angefragt ...</div>')
        $('#angebot-form').append($loc_status)
    } else {
        $loc_status.html('Standortermittlung angefragt...')
    }
    // functionality
    locating.get_browser_location(function(ok) {
        console.info("Standort OK", ok)
        location_coords = ok.coords
        $loc_status.empty()
        render_query_parameter()
    }, function(error) {
        $loc_status.html("Wir konnten deinen aktuellen Standort leider nicht automatisch ermitteln.")
        console.warn("Standortermittlung fehlerhaft", error)
        location_coords = undefined
    }, {
        enableHighAccuracy: false, timeout: 13000
    })
}

function render_query_parameter() {
    // clear and setup gui
    $('.filter-area').show("inline")
    var $filter_area = $('.query-parameter')
        $filter_area.empty()
    // render parameter
    if (location_coords) {
       $filter_area.append('<div class="parameter location"><a class="close" href="javascript:remove_location_parameter()">x</a>'
        + 'Dein Standort in L&auml;ngen- und Breitengrad (' + location_coords.longitude.toFixed(3)
        + ', ' + location_coords.latitude.toFixed(3) + ')</div>')
    }
    if (location_input) {
       $filter_area.append('<div class="parameter street-location"><a class="close" href="javascript:remove_loc_input_parameter()">x</a>'
        + 'In der N&auml;he von \"' + location_input + '\"</div>')
    }
    if (search_input) {
       $filter_area.append('<div class="parameter text"><a class="close" href="javascript:remove_text_parameter()">x</a>'
        + 'Suche nach \"' + search_input + '\"</div>')
    }
}

function remove_location_parameter() {
    location_coords = undefined
    render_query_parameter()
}

function remove_loc_input_parameter() {
    location_input = undefined
    $('#nearby').val("")
    render_query_parameter()
}

function remove_text_parameter() {
    search_input = undefined
    $('#query').val("")
    render_query_parameter()
    $('.filter-area').hide("fast")
    render_current_angebots_listing()
}

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
            throw new Error("Webpage URL is INVALID")
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
            + item.id + '">Bearbeiten</a><a href="/angebote/zuordnen/'
            + item.id + '">Zuordnungen anpassen</a><br/><small>Erstellt am '
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
    load_user_assignments(render_assignments)
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

function handle_name_search_input(e) {
    if (e.keyCode === 13) {
        search_geo_objects_by_name(show_geo_object_search_results)
    }
}

function search_geo_objects_by_name(renderer) { // usually calls show_geo_objects
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

function do_delete_assignment() {
    console.log("Do Delete Assignment", selected_assignment)
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
        toDate = new Date(toInput).getTime() // ### we want to shift this value always about 24hours
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
        console.log("Trying to post assignment", assocModel)
        // do create
        restc.request("POST", "/angebote/assignment/" + fromDate + "/" + toDate, assocModel)
    }
    // refresh GUI
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

function load_user_assignments(renderer) {
    $.ajax({
        type: "GET", url: "/angebote/list/assignments/user/" + selected_angebot.id,
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

function render_angebot_form() {
    console.log("Render Angebot Form", selected_angebot)
    if (!selected_angebot) throw new Error("No Angebot Selected")
    // Angebotsinfo
    var name = selected_angebot.name
    var contact = selected_angebot.kontakt
    var webpage = selected_angebot.webpage
    var descr = selected_angebot.beschreibung
    var tags = selected_angebot.tags
    //
    $('#angebot-name').val(name)
    $('#angebot-kontakt').val(contact)
    CKEDITOR.instances["angebot-beschreibung"].setData(descr)
    $('#angebot-webpage').val(webpage)
}

function render_angebot_header_info() {
    if (!selected_angebot || !selected_angebot.hasOwnProperty("id")) {
       throw Error("No Angebot selected, loaded", selected_angebot)
    }
    // Angebotsinfo
    var name = selected_angebot.name
    var contact = selected_angebot.kontakt
    var webpage = selected_angebot.webpage
    var descr = selected_angebot.beschreibung
    var tags = selected_angebot.tags // ### render tags
    //
    $('.angebot-name').text(selected_angebot.name)
    $('#navigation li.edit a').attr("href", "/angebote/edit/" + selected_angebot.id)
    $('.angebot-infos p.body').html(descr + '<br/><br/>Kontakt: ' + contact + '<br/>Webseite: <a href="'
        + webpage + ">" + webpage + '</a>')
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

function select_assignment(event) {
    var element = event.target
    var id = (element.localName === "div") ? element.id : ""
    if (element.localName === "h3" || element.localName === "p" || element.localName === "div") {
        id = element.parentNode.id
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
            var $element = $('<input type="radio" title="Klicken um diese Einrichtung auszuwählen ..." name="group" id="' + obj.id
                    + '" value="geo-'+obj.id+'"><label title="Klicken um diese Einrichtung auszuwählen ..." for="'+obj.id+'">'
                    + obj.name + ' (' + obj.bezirk_name + ')</label><br/>')
            $('.form-area div.einrichtungen').append($element)
        } else {
            console.warn("Error during rendering Geo Objects Assignment", obj)
        }
    }
    // equip all buttons with a click handler each (at once)
    $('input[name=group]').on('click', select_geo_object)
}

// -------------------------------- Displaying Angebotsinfos in DETAIL and LIST

function render_angebotsinfo_page() {
    load_angebot_by_resource_path()
    render_angebot_detail_area()
    load_assignments(render_angebot_locations)
    load_username(render_user_menu)
}

function render_angebotslisting_page() {
    load_current_angebotsinfos()
    render_current_angebots_listing()
    load_username(render_user_menu)
}

function render_current_angebots_listing(items) {
    var $list = $('.list-area')
    var items_to_render = angebotsinfos
    if (items) {
        items_to_render = items
        $('.headline.list h2').hide()
        $list.empty()
    } else {
        $('.headline.list h2').show()
    }
    $list.empty()
    console.log("Show Angebotinfo Listing", items_to_render)
    if (items_to_render.length === 0) {
        $list.append("<p>F&uuml;r das heutige Datum liegen uns keine Informationen zu Angeboten in Einrichtungen vor.</p>")
        $list.append("<p>Sie k&ouml;nnen sich alternativ &uuml;ber Einrichtungen in ihrer N&auml;he informieren oder "
            + "uns helfen neue oder aktuelle Angebote in die <a href=\"/sign-up/login\">Datenbank aufzunehmen</a>.</p>")
        // ("+new Date().toLocaleDateString()+")
    }
    for (var aidx in items_to_render) {
        var element = items_to_render[aidx]
        var name = element.name
        var contact = element.kontakt
        // var webpage = element.webpage
        // var descr = element.beschreibung
        // var tags = element.tags
        var location_count = element.locations.length
        var first_assignment = element.locations[get_random_int_inclusive(1, location_count+1)]
        if (!first_assignment) first_assignment = element.locations[0]
        if (first_assignment) {
            var html_string = '<a class="read-more" href="/angebote/'+element.id+'">'
                + '<div id="' + element.id + '" class="concrete-assignment"><h3 class="angebot-name">'+name+'</h3>'
                // html_string += '<p>' + descr + '</p>'
                html_string += '<p>Wird aktuell an ' + location_count + ' Orten angeboten, z.B. <b>' + first_assignment.name + '</b><br/>'
                    + 'Vom <i>'+first_assignment.anfang+'</i> bis </i>'+first_assignment.ende+'</i>&nbsp;'
                if (!is_empty(contact)) html_string += '<span class="contact">Kontakt: ' + contact + '</span>'
                // if (!is_empty(webpage)) html_string += '<a href="' + webpage + '">Webseite</a>'
                html_string += '<span class="read-more">Mehr..</span>'
                html_string += '</div></a>'
            $list.append(html_string)
        } else {
            console.warn("Could not load assignment for angebotsinfo...", element)
        }
    }
}

function is_empty(stringValue) {
    return (stringValue === "" || stringValue === " ")
}

function get_random_int_inclusive(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function render_angebot_detail_area() {
   console.log("Show Angebotinfo Details Page", selected_angebot)
   if (!selected_angebot) throw new Error("Angebotsinfo not found")
    // assemble Angebotsinfo
    var name = selected_angebot.name
    var contact = selected_angebot.kontakt
    var webpage = selected_angebot.webpage
    var descr = selected_angebot.beschreibung
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

function load_current_angebotsinfos() {
    angebotsinfos = JSON.parse($.ajax('/angebote/filter/' + new Date().getTime(),
        { async: false, dataType: 'json' }).responseText)
}

function load_angebot_by_resource_path() {
    var angebot_id = parse_angebots_id()
    selected_angebot = JSON.parse($.ajax('/angebote/' + angebot_id,
        { async: false, dataType: 'json' }).responseText)
}

// ---- Generic Methods used ACROSS all screens ---- //

function load_username(renderer) {
    $.ajax({
        type: "GET", url: "/accesscontrol/user",
        success: function(obj) {
            if (obj) {
                if (renderer) renderer(obj)
            } else {
                $('#user').html('Bitte <a href="/sign-up/login">loggen</a> sie sich ein um Angebote zu bearbeiten.')
                $('.task-info').addClass('disabled')
                $('div.angebot-area').addClass('disabled')
            }
        },
        error: function(x, s, e) {
            console.warn("ERROR", "x: " + x + " s: " + s + " e: " + e)
        }
    })
}

function render_user_menu(state) {
    console.log("Rendering User Menu (Angebote UI)", state)
    if (state) {
        $('li.login').hide()
        $('li.einrichtungen-new a').attr("href", "/geoobject/create")
        $('li.angebote').attr('style', 'display: inline-block;')
        $('li.logout').attr('style', 'display: inline-block;')
    } else {
        $('li.login').show()
        $('li.angebote').hide()
        $('li.logout').hide()
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
            $('.task-info h3').html('Entschuldigung! '
                + 'Sie haben noch keine Berechtigung eigene Angebotsinfos im Kiezatlas zu verwalten.<br/>'
                + 'Bitte kontaktieren Sie uns unter <a href="mailto:support@kiezatlas.de">support@kiezatlas.de</a> und '
                + 'unter Angabe ihres Benutzernamens mit Bezug auf diese Fehlermeldung.<br/>'
                + '<br/>Entschuldigung!')
            $('#do-add').attr("disabled", true)
            throw new Error("Unauthorized")
        } else {
            callback()
        }
    })
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
