
// ---- Methods to CREATE/UPDATE Screen --- //

var restc       = new RESTClient()
var workspace   = undefined

/** var URL_ANGEBOT_LISTING     = "/kiezatlas/angebot/"
var URL_ANGEBOT_DETAIL      = "/kiezatlas/angebot/edit/"
var URL_ANGEBOT_ASSIGNMENT  = "/kiezatlas/angebot/zuordnen/" **/

function do_save_angebot() {
    var topic_id = $('.form-area.angebot').attr("id")
        topic_id = -1
    var name = $('#angebot-name').val().trim()
    var descr = $('#angebot-beschreibung').val().trim()
    var contact = $('#angebot-kontakt').val().trim()
    var webpage = $('#angebot-webpage').val().trim()
    var tags = $('#angebot-tags').val().trim()
    console.log("Saving Angebot (TopicID: " + $('.form-area.angebot').attr("id") + ")", name, contact)
    var topic_model = {
        "id" : topic_id,
        "type_uri" : "ka2.angebot",
        "childs": {
            "ka2.angebot.name" : name,
            "ka2.angebot.beschreibung" : descr,
            "ka2.angebot.kontakt" : contact,
            "ka2.angebot.webpage" : webpage,
            "dm4.tags.tag": [{
                "dm4.tags.label": tags,
                "dm4.tags.definition": ""
            }]
        }
    } // ### fix tags and revise for edits
    restc.create_topic(topic_model)
    clear_angebot_form_area()
}

function clear_angebot_form_area() {
    $('.form-area.angebot').attr("id", -1)
    $('#angebot-name').val('')
    $('#angebot-beschreibung').val('')
    $('#angebot-kontakt').val('')
    $('#angebot-webpage').val('')
    $('#angebot-tags').val('')
}

function load_users_angebote() {
    var result = restc.request("GET", "/kiezatlas/angebot/list")
    for (var el in result) {
        var item = result[el]
        $('ul.angebote').append('<li id="'+item.id+'">'
            +item.value+ '<a href="/kiezatlas/angebot/edit/'
            +item.id+'">Infos editieren</a><a href="/kiezatlas/angebot/zuordnen/'
            +item.id+'">Zuordnungen anpassen</a></li>')
    }
}

function load_angebot(id) {
    var topic = restc.request("GET", "/kiezatlas/angebot/" + id)
    console.log("Angebotsinformation", topic)
}

// ---- Methods used for ASSIGNMENT screen (angebote to a geo object) --- //

var selected_angebot,
    selected_geo_object,
    selected_assignments

function init_angebot() {
    var current_url = document.location.pathname
    var angebot_id = current_url.slice(document.location.pathname.lastIndexOf("/")+1)
    selected_angebot = restc.get_topic_by_id(angebot_id)
    $('.angebot-name').text(selected_angebot.value)
}

function init_datepicker() {
    $( "#from" ).datepicker({
        defaultDate: "+1w",
        changeMonth: true,
        numberOfMonths: 3,
        dateFormat: "DD, d MM, yy",
        onClose: function( selectedDate ) {
          $( "#to" ).datepicker( "option", "minDate", selectedDate );
        }
    });
    $( "#to" ).datepicker({
        defaultDate: "+1w",
        changeMonth: true,
        numberOfMonths: 3,
        dateFormat: "DD, d MM, yy",
        onClose: function( selectedDate ) {
          $( "#from" ).datepicker( "option", "maxDate", selectedDate );
        }
    });
}

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
}


function do_assign_angebot() {
    // ### Insert default values to initialize if not specified
    var fromInput = $('input#from').val()
    var toInput = $('input#to').val()
    var fromDate = -1
    var toDate = -1
    if (fromInput.length > 0) {
        fromDate = new Date(fromInput).getTime()
    }
    if (toInput.length > 0) {
        toDate = new Date(toInput).getTime() // ### we want to shift this value always about 24hours
    }
    console.log("Datepicker delivered us from:to", fromDate, toDate)
    if (!selected_geo_object) throw new Error("Assertion failed: A geo object must be selected before an assignment can be created.")
    if (!selected_angebot) throw new Error("Assertion failed: An angebot must be loaded before an assignment can be created.")
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
    restc.request("POST", "/kiezatlas/angebot/assignment/" + fromDate + "/" + toDate, assocModel)
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

function load_assignments(renderer) {
    $.ajax({
        type: "GET", url: "/kiezatlas/angebot/list/assignments/" + selected_angebot.id,
        success: function(response) {
            if (response) {
                selected_assignments = response
                console.log("Loaded Angebot Assignments ", selected_assignments)
                if (renderer) renderer(response)
            } else {
                $('#user').html('Bitte <a href="/sign-up/login">loggen</a> sie sich ein um Zuordnungen zu bearbeiten.')
                $('.task-info').addClass('disabled')
                $('div.angebot-area').addClass('disabled')
            }
        },
        error: function(x, s, e) {
            console.warn("ERROR", "x: " + x + " s: " + s + " e: " + e)
        }
    })
}

function show_assignments(elements) {
    $('.right-side div.einrichtungen').empty()
    for (var i in elements) {
        var obj = elements[i]
        var startDate = $.datepicker.formatDate('dd.mm', new Date(obj.von));
        var endDate = $.datepicker.formatDate('dd.mm.yyyy', new Date(obj.bis));
        var $element = $('<div id="' + obj.id + '" class="concrete-assignment">'
            + obj.name + ' <span class="small">, <b>von</b> <i>' + startDate + '</i> <b>bis</b> <i>'
            + endDate + '</i></span></div>')
        $('.right-side div.einrichtungen').append($element)
    }
    // equip all buttons with a click handler each (at once)
    $('input[name=group]').on('change', select_geo_object)
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

function show_user_dialog(username) {
    $('#user').append('<h4>Eingeloggt als <span class="value">'+username+'</span></h4>')
}

function fetch_angebote_workspace() {
    var angebote_workspace_uri = "de.kiezatlas.angebote_ws"
    $.getJSON('/core/topic/by_value/uri/' + angebote_workspace_uri, function(result){
        console.log("Loaded Angebote Workspace", result)
        workspace = result
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

fetch_angebote_workspace()
// TODO: set workspace cookie
