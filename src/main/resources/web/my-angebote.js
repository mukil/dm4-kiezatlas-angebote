
// --- Rest Client Methods to load personal data entries ---- //

function load_users_angebote() {
    var result = restc.request("GET", "/angebote/my/json")
    result.sort(angebote_compare_by_last_modified)
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
            + '<div class="ui input focus edit-angebot"><button title="Angebotsinfos bearbeiten" '
                + 'onclick="go_edit_angebot('+item.id+')"><i class="edit icon" />Bearbeiten</button></div>'
            + '<div class="ui input focus edit-assignments"><button title="Hier kannst du deine '
                + 'Angebotsinfos Einrichtungen terminlich zuweisen" onclick="go_edit_assignments('+item.id+')">'
                + '<i class="add to calendar icon" />Angebotszeiträume veröffentlichen</button></div>'
            + '<div class="ui input focus delete-angebot"><button title="Achtung: Löscht diese '
                + 'Angebotsinfo" onclick="delete_my_angebot('+item.id+')"><i class="trash icon" /></button></div>'
        + '</div>'
        + '<br/><small>Erstellt am ' + created + ', zuletzt bearbeitet am '+ modified + '</small></li>')
}

function load_users_einrichtungen() {
    var result = restc.request("GET", "/website/geo/my/json")
    for (var el in result) {
        var item = result[el]
        render_einrichtungs_item(item)
    }
}

function render_einrichtungs_item(item) {
    var isInTrash = (item.class) ? (item.class.indexOf('in-trash') != -1) : false
    var isUnconfirmed = (item.class) ? (item.class.indexOf('in-trash') != -1) : false
    var itemTitle = "Ortsdatensatz anzeigen"
    if (isInTrash) itemTitle = 'Ortsdatensatz liegt zur Löschung im Papierkorb'
    if (isUnconfirmed) itemTitle = 'Ortsdatensatz ist aktuell nicht öffentlich'
    // console.log("Einrichtung", item, isInTrash)
    $('ul.einrichtungen').append('<li id="'+item.id+'" class="'+item.class+'" title="' + itemTitle + '">'
        + '<a href="/website/geo/'+item.id+'"><b>' + item.name + '</b></a>'
        + '<div class="list-commands">'
            + '<div class="ui input focus edit-angebot"><button title="Einrichtungsdatensatz ansehen" '
                + 'onclick="go_edit_einrichtung('+item.id+')"><i class="edit icon" />Ansehen</button></div>'
            + '<div class="ui input focus edit-angebot"><button title="Einrichtungsdatensatz bearbeiten" '
                + 'onclick="go_edit_einrichtung_form('+item.id+')"><i class="edit icon" />Bearbeiten</button></div>'
        + '</div>'
        + '<br/><small>Erstellt am ' + item.created_string + ', zuletzt bearbeitet am '+ item.last_modified_string + '</small></li>')
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
