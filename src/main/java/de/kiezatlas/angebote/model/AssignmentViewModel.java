package de.kiezatlas.angebote.model;

import de.deepamehta.core.JSONEnabled;
import de.deepamehta.core.Topic;
import de.deepamehta.core.Association;
import de.deepamehta.plugins.geomaps.GeomapsService;
import de.kiezatlas.angebote.AngebotPlugin;
import de.kiezatlas.angebote.AngebotService;
import de.kiezatlas.website.model.GeoObjectView;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;

import java.util.logging.Logger;


/**
 * A data transfer object as returned by the Kiezatlas Angebots service.
 * ### Free us of the "dm4-kiezatlas-website" dependency.
 */
public class AssignmentViewModel implements JSONEnabled {

    // ---------------------------------------------------------------------------------------------- Instance Variables

    private JSONObject json = new JSONObject();
    private Association assignment = null;
    private GeoObjectView geoObject = null;
    private Logger logger = Logger.getLogger(getClass().getName());

    // -------------------------------------------------------------------------------------------------- Public Methods

    public AssignmentViewModel(Association assignment, Topic geoObject, GeomapsService geomapsService,
            AngebotService angebote) {
        this.assignment = assignment.loadChildTopics();
        this.geoObject = new GeoObjectView(geoObject, geomapsService, angebote);
    }

    @Override
    public JSONObject toJSON() {
        try {
            json.put("id", assignment.getId());
            json.put("name", getGeoObjectName());
            json.put("von", getStartDate());
            json.put("bis", getEndDate());
            json.put("zusatzinfo", getZusatzInfo());
            json.put("kontakt", getZusatzKontakt());
            return json;
        } catch (JSONException ex) {
            throw new RuntimeException("Constructing an AssignmentViewModel failed", ex);
        }
    }

    // ----------------------------------------------------------------------------------------- Package Private Methods

    private String getGeoObjectName() {
        return (geoObject == null) ? "" : geoObject.getName();
    }

    private Long getStartDate() {
        Long value = new Long(-1);
        try {
            if (this.assignment.hasProperty(AngebotPlugin.ANGEBOT_START_TIME)) {
                value = (Long) this.assignment.getProperty(AngebotPlugin.ANGEBOT_START_TIME);
            }
            return value;
        } catch (Exception e) {
            throw new RuntimeException("Constructing an AssignmentViewModel failed", e);
        }
    }

    private Long getEndDate() {
        Long value = new Long(-1);
        try {
            if (this.assignment.hasProperty(AngebotPlugin.ANGEBOT_END_TIME)) {
                value = (Long) this.assignment.getProperty(AngebotPlugin.ANGEBOT_END_TIME);
            }
            return value;
        } catch (Exception e) {
            throw new RuntimeException("Constructing an AssignmentViewModel failed", e);
        }
    }

    private String getZusatzKontakt() {
        String value = null;
        try {
            if (this.assignment.getChildTopics().has("ka2.angebot.assignment_kontakt")) {
                value = this.assignment.getChildTopics().getString("ka2.angebot.assignment_kontakt");
            }
            return value;
        } catch (Exception e) {
            throw new RuntimeException("Constructing an AssignmentViewModel failed", e);
        }
    }

    private String getZusatzInfo() {
        String value = null;
        try {
            if (this.assignment.getChildTopics().has("ka2.angebot.assignment_info")) {
                value = this.assignment.getChildTopics().getString("ka2.angebot.assignment_info");
            }
            return value;
        } catch (Exception e) {
            throw new RuntimeException("Constructing an AssignmentViewModel failed", e);
        }
    }

    private JSONObject getGeoObject() {
        try {
            return geoObject.toJSON();
        } catch (Exception e) {
            throw new RuntimeException("Constructing an AssignmentViewModel failed", e);
        }
    }

}
