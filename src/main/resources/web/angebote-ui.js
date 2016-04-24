
// ---- Methods to CREATE/UPDATE Screen --- //

var restc       = new RESTClient()
var workspace   = undefined

var URL_ANGEBOT_LISTING     = "/kiezatlas/angebot/"
var URL_ANGEBOT_DETAIL      = "/kiezatlas/angebot/edit/"
var URL_ANGEBOT_ASSIGNMENT  = "/kiezatlas/angebot/zuordnen/"
var WORKSPACE_COOKIE_NAME   = "dm4_workspace_id"

// jQuery UI Datepicker Widget with German Local Dependency
$.datepicker.setDefaults($.datepicker.regional["de"])

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
            go_to_angebot_listing()
        }, 1500)
    }
}

function go_to_angebot_listing() {
    window.document.location.assign(URL_ANGEBOT_LISTING)
}

function autocorrect_url(current_url) {
    var PROTOCOL_START = "http"
    if (!current_url.contains("http") ) {
        $('#angebot-webpage').val(PROTOCOL_START + '://' + current_url)
        console.log('Wir haben ein HTTP hinzugef&uuml;gt', current_url)
    }
    return is_valid_url(current_url)

    function is_valid_url(url) {
        var parser = document.createElement('a')
        try {
            parser.href = url
            return (parser.hostname != "localhost" && !!parser.hostname)
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
    var result = restc.request("GET", "/kiezatlas/angebot/list")
    for (var el in result) {
        var item = result[el]
        var created_val = new Date(item['childs']['dm4.time.created']['value'])
        var modified_val = new Date(item['childs']['dm4.time.modified']['value'])
        var created = $.datepicker.formatDate("dd. MM yy", created_val)
        var modified = $.datepicker.formatDate("dd. MM yy", modified_val)
        // console.log("Angebot Item", item, created, modified)
        $('ul.angebote').append('<li id="'+item.id+'">' + item.value + '<a href="/kiezatlas/angebot/edit/'
            + item.id + '">Infos editieren</a><a href="/kiezatlas/angebot/zuordnen/'
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
    load_assignments(render_assignments)
}

var fromDate,
    toDate

function init_datepicker() {
    // init our two datepicker fields
    fromDate = $( "#from" ).datepicker({
        defaultDate: "+1w",
        changeMonth: true,
        numberOfMonths: 3,
        dateFormat: "DD, d MM, yy",
        onClose: function( selectedDate ) {
            $( "#to" ).datepicker("option", "minDate", selectedDate )
        }
    })
    toDate = $( "#to" ).datepicker({
        defaultDate: "+1w",
        changeMonth: true,
        numberOfMonths: 3,
        dateFormat: "DD, d MM, yy",
        onClose: function( selectedDate ) {
            $( "#from" ).datepicker( "option", "maxDate", selectedDate )
        }
    })
}

// ---- Create Assignments for selected_angebot to Geo Objects -----

function search_objects_by_name(renderer) { // usually calls show_geo_objects
    var queryString = $("#name-search").val()
        if (queryString.indexOf("*") === -1) {
            queryString += "*"
        }
        queryString = encodeURIComponent(queryString, "UTF-8")
        $.ajax({
            type: "GET", url: "/kiezatlas/search/by_name?query=" + queryString,
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
    restc.request("POST", "/kiezatlas/angebot/assignment/" +selected_assignment.id + "/delete")
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
        restc.request("POST", "/kiezatlas/angebot/assignment/" +selected_assignment.id + "/" + fromDate + "/" + toDate)
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
        restc.request("POST", "/kiezatlas/angebot/assignment/" + fromDate + "/" + toDate, assocModel)
    }
    // refresh GUI
    render_assignment_page()
}

// ----- List and Edit existing Assignments (of Angebote to Geo Objects) -----

function load_assignments(renderer) {
    $.ajax({
        type: "GET", url: "/kiezatlas/angebot/list/assignments/" + selected_angebot.id,
        success: function(response) {
            if (response) {
                geo_assignments = response
                console.log("Loaded Angebot Geo Assignments ", geo_assignments)
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
    $('#navigation li.edit a').attr("href", "/kiezatlas/angebot/edit/" + selected_angebot.id)
    $('.angebot-infos').html(descr + '<br/><br/>Kontakt: ' + contact + '<br/>Webseite: <a href="'
        + webpage + ">" + webpage + '</a>')
}

function render_assignments() {
    // Display Assignments
    $('.right-side div.einrichtungen').empty()
    if (geo_assignments.length == 0) {
        $('.help').html('Dieses Angebot ist aktuell noch keinen Einrichtungen zugeordnet.')
    } else {
        // $('.help').html('Um einen Zeitraum zu aktualisieren w&auml;hlen Sie diesen bitte aus.')
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
        $('#do-assign').attr("value", "Ändern")
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

function show_geo_objects_assign(results) {
    $('.form-area div.einrichtungen').empty()
    for (var i in results) {
        var obj = results[i]
        if (obj) {
            var $element = $('<input type="radio" name="group" id="' + obj.id
                    + '" value="geo-'+obj.id+'"><label for="'+obj.id+'">'
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
    load_assignments(render_assignments)
}

function render_angebotslisting_page() {
    load_current_angebotsinfos()
    render_current_angebots_listing()
}

function render_current_angebots_listing() {
    console.log("Show Angebotinfo Listing", angebotsinfos)
    var $list = $('.list-area')
    for (var aidx in angebotsinfos) {
        var element = angebotsinfos[aidx]
        var name = element.name
        var contact = element.kontakt
        var webpage = element.webpage
        var descr = element.beschreibung
        var tags = element.tags
        var location_count = element.locations.length
        var first_assignment = element.locations[get_random_int_inclusive(1, location_count+1)]
        if (!first_assignment) first_assignment = element.locations[0]
        var html_string = '<a class="read-more" href="/kiezatlas/angebot/'+element.id+'">'
            + '<div id="' + element.id + '" class="concrete-assignment"><h3 class="angebot-name">'+name+'</h3>'
            // html_string += '<p>' + descr + '</p>'
            html_string += '<p>Wird aktuell an ' + location_count + ' Orten angeboten, z.B. vom <i>'+first_assignment.anfang+'</i> bis </i>'+first_assignment.ende+'</i>, <b>' + first_assignment.name + '</b><br/>'
            if (!is_empty(contact)) html_string += 'Kontakt: ' + contact
            // if (!is_empty(webpage)) html_string += '<a href="' + webpage + '">Webseite</a>'
            html_string += '<span class="read-more">Mehr erfahren..</span>'
            html_string += '</div></a>'
        $list.append(html_string)
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
    // Angebotsinfo
    var name = selected_angebot.name
    var contact = selected_angebot.kontakt
    var webpage = selected_angebot.webpage
    var descr = selected_angebot.beschreibung
    var tags = selected_angebot.tags // ### render tags
    //
    $('.angebot-name').text(name)
    $('.angebot-infos').html(descr + '<br/><br/>Kontakt: ' + contact + '<br/>Webseite: <a href="'
        + webpage + ">" + webpage + '</a>')
}

function load_current_angebotsinfos() {
    angebotsinfos = JSON.parse($.ajax('/kiezatlas/angebot/filter/' + new Date().getTime(),
        { async: false, dataType: 'json' }).responseText)
}

function load_angebot_by_resource_path() {
    var angebot_id = parse_angebots_id()
    selected_angebot = JSON.parse($.ajax('/kiezatlas/angebot/' + angebot_id,
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
    if (state) {
        $('li.register').hide()
        $('li.login').hide()
        $('li.angebote').attr('style', 'display: inline-block;')
        $('li.logout').attr('style', 'display: inline-block;')
    } else {
        $('li.register').show()
        $('li.login').show()
        $('li.angebote').hide()
        $('li.logout').hide()
    }
}

function fetch_angebote_workspace() {
    var angebote_workspace_uri = "de.kiezatlas.angebote_ws"
    $.getJSON('/core/topic/by_value/uri/' + angebote_workspace_uri, function(result){
        workspace = result
        document.cookie = WORKSPACE_COOKIE_NAME + "=" + workspace.id + "; "
        console.log("Set Angebote Workspace Cookie", result)
    })
}

function has_angebote_membership(callback) {
    // var angebote_workspace_uri = "de.kiezatlas.angebote_ws"
    $.getJSON('/kiezatlas/angebot/membership/', function(response) {
        if (!response) {
            $('.task-info h3').html('Entschuldigung! '
                + 'Sie haben noch keine Berechtigung eigene Angebotsinfos im Kiezatlas zu verwalten.<br/>Bitte <a href="/sign-up">registrieren</a> sie sich '
                + 'zuerst unter Angabe einer Email Adresse.')
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
