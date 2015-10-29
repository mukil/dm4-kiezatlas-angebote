
// ---- Methods to create new and update existing Angebote --- //

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
    }
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

function get_users_angebote() {
    var result = restc.request("GET", "/kiezatlas/angebot/list")
    for (var el in result) {
        var item = result[el]
        $('ul.angebote').append('<li id="'+item.id+'">'
                +item.value+ '<a href="/kiezatlas/angebot/edit/'
                +item.id+'">Infos editieren</a><a href="/kiezatlas/angebot/zuordnen/'
                +item.id+'">Zuordnungen anpassen</a></li>')
    }
    
    
}


// ---- Methods used in assignment screen (angebote to a geo object) --- //

var selected_angebot,
    selected_geo_object

function select_geo_object(e) {
    var geo_object = restc.get_topic_by_id(e.target.id)
    // gui state
    selected_geo_object = geo_object
    // update label
    $('.einrichtung-name').text(geo_object.value)
    // update area
    $('.date-area').removeClass("disabled")
}

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

function geo_objects_by_name(renderer) {
    var query = $("#name-search").val()
        if (query.indexOf("*") === -1) {
            query += "*"
            console.log("Appending * to query=", query)
        }
        query = encodeURIComponent(query, "UTF-8")
        $.ajax({
            type: "GET", url: "/kiezatlas/by_name?query=" + query,
            success: function(obj) {
                console.log("SUCCESS", obj)
                renderer(obj)
            },
            error: function(x, s, e) {
                console.warn("ERROR", "x: " + x + " s: " + s + " e: " + e)
            }
        })
}

// ---- Generic Methods used across all screens ---- //

function get_username(renderer) {
    $.ajax({
        type: "GET", url: "/accesscontrol/user",
        success: function(obj) {
            console.log("OK", obj)
            renderer(obj)
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
