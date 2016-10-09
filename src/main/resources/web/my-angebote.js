
// --- Rest Client Methods to load personal data entries ---- //

function load_users_angebote() {
    var result = restc.request("GET", "/angebote/my")
    for (var el in result) {
        var item = result[el]
        render_angebots_item(item)
    }
}

function render_angebots_item(item) {
    var created_val = new Date(item['childs']['dm4.time.created']['value'])
    var modified_val = new Date(item['childs']['dm4.time.modified']['value'])
    var created = $.datepicker.formatDate("dd. MM yy", created_val)
    var modified = $.datepicker.formatDate("dd. MM yy", modified_val)
    // console.log("Angebot Item", item, created, modified)
    $('ul.angebote').append('<li id="'+item.id+'"><a href="/angebote/'+item.id+'" title="View Angebotsinfo"><b>' + item.value + '</b></a>'
        + '<div class="list-commands">'
            + '<div class="ui input focus edit-angebot"><button title="Angebotsinfos bearbeiten" class="ui mini button" '
                + 'onclick="go_edit_angebot('+item.id+')"><i class="edit icon" />Bearbeiten</button></div>'
            + '<div class="ui input focus edit-assignments"><button class="ui mini button" title="Hier kannst du deine '
                + 'Angebotsinfos Einrichtungen terminlich zuweisen" onclick="go_edit_assignments('+item.id+')">'
                + '<i class="add to calendar icon" />Angebotszeiträume</button></div>'
            + '<div class="ui input focus delete-angebot"><button class="ui red mini button" title="Achtung: Löscht diese '
                + 'Angebotsinfo" onclick="delete_my_angebot('+item.id+')"><i class="trash icon" /></button></div>'
        + '</div>'
        + '<br/><small>Erstellt am ' + created + ', zuletzt bearbeitet am '+ modified + '</small></li>')
}

function load_users_einrichtungen() {
    var result = restc.request("GET", "/geoobject/my")
    for (var el in result) {
        var item = result[el]
        render_einrichtungs_item(item)
    }
}

function render_einrichtungs_item(item) {
    var created_val = new Date(item['childs']['dm4.time.created']['value'])
    var modified_val = new Date(item['childs']['dm4.time.modified']['value'])
    var created = $.datepicker.formatDate("dd. MM yy", created_val)
    var modified = $.datepicker.formatDate("dd. MM yy", modified_val)
    // console.log("Einrichtung", item, created, modified)
    $('ul.einrichtungen').append('<li id="'+item.id+'"><a href="/angebote/'+item.id+'" title="View Einrichtungspage"><b>' + item.value + '</b></a>'
        + '<div class="list-commands">'
            + '<div class="ui input focus edit-angebot"><button title="Einrichtungsdatensatz bearbeiten" '
                + 'onclick="go_edit_einrichtung('+item.id+')"><i class="edit icon" />Bearbeiten</button></div>'
            // + '<div class="ui input focus delete-angebot"><button title="Einrichtungsdatensatz entfernen" '
               //  + 'onclick="delete_my_einrichtung('+item.id+')"><i class="trash icon" /></button></div>'
        + '</div>'
        + '<br/><small>Erstellt am ' + created + ', zuletzt bearbeitet am '+ modified + '</small></li>')
}

function delete_my_angebot(id) {
    $("#dialog-confirm").dialog({ resizable: false, height: "auto", width: 340, modal: true,
        title: "Angebotsvorlage löschen", buttons: {
            "Ja, löschen": function() {
                restc.request("DELETE", "/angebote/" + id)
                $('ul.angebote').empty()
                load_users_angebote()
                $( this ).dialog( "close" );
            },
            "Nein": function() {
                $( this ).dialog( "close" );
            }
        }
    })
}

/** function delete_my_einrichtung(id) {
    console.log("Try to delete institution", id)
     $("#dialog-confirm").dialog({ resizable: false, height: "auto", width: 340, modal: true,
        buttons: {
            "Ja, löschen": function() {
                restc.request("DELETE", "/geoobject/" + id)
                $('ul.einrichtungen').empty()
                load_users_einrichtungen()
            },
            "Nein": function() {
                $( this ).dialog( "close" );
            }
        }
    })
} **/
