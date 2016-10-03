
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