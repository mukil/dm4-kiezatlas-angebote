package de.kiezatlas.angebote;

import de.deepamehta.core.JSONEnabled;

import org.codehaus.jettison.json.JSONObject;



/**
 * A data transfer object as returned by the Kiezatlas Angebots service.
 */
public class AngebotViewModel implements JSONEnabled {

    // ---------------------------------------------------------------------------------------------- Instance Variables

    private JSONObject json = new JSONObject();

    // -------------------------------------------------------------------------------------------------- Public Methods

    @Override
    public JSONObject toJSON() {
        return json;
    }

    // ----------------------------------------------------------------------------------------- Package Private Methods

    void setName(String name) {
        try {
            json.put("name", name);
        } catch (Exception e) {
            throw new RuntimeException("Constructing an Angebot failed", e);
        }
    }

    void setDescription(String description) {
        try {
            json.put("beschreibung", description);
        } catch (Exception e) {
            throw new RuntimeException("Constructing an Angebot failed", e);
        }
    }
    
    void setWebsite(String link) {
        try {
            json.put("website", link);
        } catch (Exception e) {
            throw new RuntimeException("Constructing an Angebot failed", e);
        }
    }

    void setKontakt (String kontakt) {
        try {
            json.put("kontakt", kontakt);
        } catch (Exception e) {
            throw new RuntimeException("Constructing an Angebot failed", e);
        }
    }

}
