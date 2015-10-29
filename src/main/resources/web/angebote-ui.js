
// ---- Methods to CREATE/UPDATE Angebote --- //

var restc = new RESTClient()

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


// ---- Methods used for ASSIGNMENT screen (angebote to a geo object) --- //

var selected_angebot,
    selected_geo_object

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

function search_objects_by_name(renderer) {
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
                console.log("OK", obj)
                renderer(obj)
            } else {
                $('#user').html('Bitte <a href="/sign-up/login">loggen</a> sie sich ein um Angebote zu bearbeiten.')
                $('#task-info').addClass('disabled')
                $('div.angebot-area').addClass('disabled')
            }
        },
        error: function(x, s, e) {
            console.warn("ERROR", "x: " + x + " s: " + s + " e: " + e)
        }
    })
}

function show_geo_objects(results) {
    $('div.einrichtungen').empty()
    for (var i in results) {
        var obj = results[i]
        var $element = $('<input type="radio" name="group" id="' + obj.id
                + '" value="geo-'+obj.id+'"><label for="'+obj.id+'">'
                + obj.name + '</label><br/>')
        $('div.einrichtungen').append($element)
    }
    // equip all buttons with a click handler each (at once)
    $('input[name=group]').on('change', select_geo_object)
}

function show_user_dialog(username) {
    $('#user').append('<h4>Eingeloggt als <span class="value">'+username+'</span></h4>')
}
