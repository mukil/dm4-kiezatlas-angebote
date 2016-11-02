
// --- Angebote und Websites UI Routes

var URL_ANGEBOT_LISTING     = "/angebote/"
var URL_MY_ANGEBOT_LIST     = "/angebote/my"
var URL_ANGEBOT_DETAIL      = "/angebote/"
var URL_ANGEBOT_EDIT        = "/angebote/edit/"
var URL_ANGEBOT_ASSIGNMENT  = "/angebote/zuordnen/"
var URL_EINRICHTUNG_EDIT    = "/website/geo/edit/"
var URL_EINRICHTUNG         = "/website/geo/"
var URL_EINRICHTUNG_CREATE  = "/website/geo/"

var WORKSPACE_COOKIE_NAME   = "dm4_workspace_id"

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

function _void() {}


// ---- Generic Methods used ACROSS all screens ---- //

function show_saving_icon(domSelector) {
    $(domSelector).addClass("loading").addClass("circle").removeClass("save")
}

function hide_saving_icon(domSelector) {
    $(domSelector).removeClass("loading").removeClass("circle").addClass("save")
}

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
    // ### Show Administration Menu for "Confirmation" WS Members
    if (state) {
        $('.username').text(state)
        $('.menu .login.item').hide()
        $('.menu .angebote.item').attr('style', 'display: inline-block;')
        $('.menu .logout.item').attr('style', 'display: inline-block;')
    } else {
        $('.menu .login.item').show()
        $('.menu .angebote.item').hide()
        $('.menu .logout.item').hide()
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
    $.get('/angebote/membership/', function(response) {
        if (callback) callback(JSON.parse(response))
    })
}

function is_angebote_creator(id, callback) {
    $.get('/angebote/' + id + '/creator', function(response) {
        if (callback) callback(JSON.parse(response))
    })
}

function go_edit_einrichtung_form(id) {
    window.document.location.replace(URL_EINRICHTUNG_EDIT + id)
}

function go_edit_einrichtung(id) {
    window.document.location.replace(URL_EINRICHTUNG + id)
}

function go_edit_angebot(id) {
    window.document.location.replace(URL_ANGEBOT_EDIT + id)
}

function go_edit_assignments(id) {
    window.document.location.replace(URL_ANGEBOT_ASSIGNMENT + id)
}

function go_to_angebot_assignment(id) {
    if (id) {
        window.document.location = URL_ANGEBOT_ASSIGNMENT + id
    } else {
        setTimeout(function(e) {
            go_to_my_angebot_listing()
        }, 1500)
    }
}

function go_to_frontpage() {
    window.document.location = "/"
}

function go_to_my_angebot_listing() {
    window.document.location = URL_MY_ANGEBOT_LIST
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

function get_latest_angebote_end_time(a) {
    var latestEndTime = 0
    for (var ai in a.locations) {
        var assignment = a.locations[ai]
        if (assignment["ende_timestamp"] > latestEndTime) latestEndTime = assignment["ende_timestamp"]
    }
    return latestEndTime
}

function angebote_compare_by_end_earliest_last(a, b) {
    var oldestEndA = get_latest_angebote_end_time(a)
    var oldestEndB = get_latest_angebote_end_time(b)
    if (oldestEndA < oldestEndB) // sort string ascending
        return -1
    if (oldestEndA > oldestEndB)
        return 1
    return 0 //default return value (no sorting)
}

function angebote_compare_by_end_latest_first(a, b) {
    // compare "a" and "b" in some fashion, and return -1, 0, or 1
    var oldestEndA = get_latest_angebote_end_time(a)
    var oldestEndB = get_latest_angebote_end_time(b)
    if (oldestEndA > oldestEndB) // sort string descending
        return -1
    if (oldestEndA < oldestEndB)
        return 1
    return 0 //default return value (no sorting)
}

// ---- Kiezatlas 2 Website Script Copy ----

function logout() {
    $.post('/accesscontrol/logout', function(username) {
        if (!username) render_user_menu(false)
    })
}

// ---- Initialize script

fetch_angebote_workspace()
