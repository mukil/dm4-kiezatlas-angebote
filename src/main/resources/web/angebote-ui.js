
// ---- Methods to CREATE/UPDATE Screen --- //

var restc       = new RESTClient()
var workspace   = undefined

var URL_ANGEBOT_LISTING     = "/kiezatlas/angebot/"
var URL_ANGEBOT_DETAIL      = "/kiezatlas/angebot/edit/"
var URL_ANGEBOT_ASSIGNMENT  = "/kiezatlas/angebot/zuordnen/"

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
        if (webpage == "http://" || webpage == "https://") {
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
        topic = restc.update_topic(topic_model)
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
    window.document.location.assign(URL_ANGEBOT_ASSIGNMENT + "/" + id)
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
        var created = $.datepicker.formatDate("dd.mm yy", created_val)
        var modified = $.datepicker.formatDate("dd.mm yy", modified_val)
        // console.log("Angebot Item", item, created, modified)
        $('ul.angebote').append('<li id="'+item.id+'">'
            +item.value+ '<a href="/kiezatlas/angebot/edit/'
            +item.id+'">Infos editieren</a><a href="/kiezatlas/angebot/zuordnen/'
            +item.id+'">Zuordnungen anpassen</a> &nbsp; <small>Erstellt: ' + created + ' Zuletzt bearbeitet: ' +
            modified + '</small></li>')
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
    geo_assignments

function render_assignment_page() {
    load_angebot()
    init_datepicker()
    render_angebot_header_info()
    load_assignments(render_assignments)
}

function load_angebot() {
    var current_url = document.location.pathname
    var angebot_id = current_url.slice(document.location.pathname.lastIndexOf("/")+1)
    selected_angebot = JSON.parse($.ajax('/kiezatlas/angebot/' + angebot_id,
        { async: false, dataType: 'json' }).responseText)
}

var fromDate,
    toDate

function init_datepicker() {
    // ### set all datepickers to display german text
    // $.datepicker.setDefaults( $.datepicker.regional["de"] )
    // init our two datepicker fields
    fromDate = $( "#from" ).datepicker({
        defaultDate: "+1w",
        changeMonth: true,
        numberOfMonths: 3,
        dateFormat: "DD, d MM, yy",
        onClose: function( selectedDate ) {
          $( "#to" ).datepicker( "option", "minDate", selectedDate )
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
            type: "GET", url: "/kiezatlas/by_name?query=" + queryString,
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
    // gui state
    selected_geo_object = geo_object
    // update label
    $('.einrichtung-name').text(geo_object.value)
    // update area
    $('.date-area').removeClass("disabled")
    $('#do-assign').attr("value", "Speichern")
    $('#do-delete').addClass("hidden")
}

function do_delete_assignment() {
    console.log("Do Delete Assignment", selected_assignment)
    // Do Delete
    restc.request("POST", "/kiezatlas/angebot/assignment/" +selected_assignment.id + "/delete")
    selected_assignment = undefined
    selected_geo_object = undefined // may be empty anway..
    // refresh GUI
    clear_assignment_date_area()
    render_assignment_page()
}

function do_save_assignment(e) {
    // ### Insert default values to initialize if not specified
    var fromInput = $('input#from').val()
    var toInput = $('input#to').val()
    var fromDate = -1
    var toDate = -1
    // parse dates
    if (fromInput.length > 0) {
        fromDate = new Date(fromInput).getTime()
    }
    if (toInput.length > 0) {
        toDate = new Date(toInput).getTime() // ### we want to shift this value always about 24hours
    }
    console.log("Datepicker delivered us from, to", fromInput, fromDate, toInput, toDate)
    if (!selected_angebot) throw new Error("Assertion failed: An angebot must be loaded before an assignment can be created.")
    // Update
    if (selected_assignment && (fromDate != selected_assignment.von || toDate != selected_assignment.bis)) {
        console.log("Dates Changed - Update Assignment", fromDate, selected_assignment.von,
            "To:", toDate, selected_assignment.bis)
        // Do Update
        restc.request("POST", "/kiezatlas/angebot/assignment/" +selected_assignment.id + "/" + fromDate + "/" + toDate)
    } else {
    // Create
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
            console.warn("ERROR", "x: " + x + " s: " + s + " e: " + e)
        }
    })
}

function render_angebot_form() {
    console.log("Render Angebot Form", selected_angebot)
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
   console.log("Show Global Angebotinfos for Assignments ", selected_angebot)
    // Angebotsinfo
    var name = selected_angebot.name
    var contact = selected_angebot.kontakt
    var webpage = selected_angebot.webpage
    var descr = selected_angebot.beschreibung
    var tags = selected_angebot.tags
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
        var startDate = $.datepicker.formatDate('DD, dd.mm yy', new Date(obj.von));
        var endDate = $.datepicker.formatDate('DD, dd.mm yy', new Date(obj.bis));
        var $element = $('<div id="' + obj.id + '" class="concrete-assignment" '
            + ' title="Zum bearbeiten dieses Zeitraums bitte Klicken"><h3>'
            + obj.name + '</h3><p><i>' + startDate + '</i> &ndash; <i>'
            + endDate + '</i></p></div>')
        $('.right-side div.einrichtungen').append($element)
    }
    // equip all buttons with a click handler each (at once)
    $('.right-side .concrete-assignment').on('click', select_assignment)
}

function select_assignment(event) {
    var id = event.currentTarget.id
    var assignment = get_assignment(id)
    console.log("Select Assignment Association ID", id, assignment)
    selected_assignment = assignment
    show_selected_assignment()
}

function show_selected_assignment() {
    $('.concrete-assignment').removeClass('selected')
    $('#' + selected_assignment.id).addClass('selected')
    $('.date-area').removeClass("disabled")
    $('.date-area .einrichtung-name').text(selected_assignment.name)
    $('#from').datepicker("setDate", new Date(selected_assignment.von))
    $('#to').datepicker("setDate", new Date(selected_assignment.bis))
    $('#do-assign').attr("value", "Ändern")
    $('#do-delete').removeClass("hidden")
}

function get_assignment(assocId) {
    if (!geo_assignments) throw new Error("Client was not initialized correctly, assignments undefined");
    for (var e in geo_assignments) {
        var sel = geo_assignments[e]
        if (sel.id == assocId) return sel
    }
}

function show_geo_objects_assign(results) {
    $('.form-area div.einrichtungen').empty()
    for (var i in results) {
        var obj = results[i]
        var $element = $('<input type="radio" name="group" id="' + obj.id
                + '" value="geo-'+obj.id+'"><label for="'+obj.id+'">'
                + obj.name + ' (' + obj.bezirk_name + ')</label><br/>')
        $('.form-area div.einrichtungen').append($element)
    }
    // equip all buttons with a click handler each (at once)
    $('input[name=group]').on('change', select_geo_object)
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
        document.cookie = "dm4_workspace_id=" + workspace.id + ";"
        console.log("Set Angebote Workspace Cookie", result)
    })
}

function has_angebote_membership(callback) {
    var angebote_workspace_uri = "de.kiezatlas.angebote_ws"
    $.getJSON('/kiezatlas/angebot/membership/', function(response) {
        if (!response) {
            $('.task-info h3').html('Entschuldigung! '
                + 'Sie haben keine Berechtigung eigene Angebotsinfos im Kiezatlas zu verwalten.')
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
