package de.kiezatlas.angebote.model;

import de.deepamehta.core.JSONEnabled;
import de.deepamehta.core.Topic;
import de.deepamehta.core.Association;
import de.deepamehta.plugins.geomaps.GeomapsService;
import de.kiezatlas.angebote.KiezatlasAngebotPlugin;
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
    private Association topic = null;
    private GeoObjectView geoObject = null;
    private Logger logger = Logger.getLogger(getClass().getName());

    // -------------------------------------------------------------------------------------------------- Public Methods

    public AssignmentViewModel(Association assignment, Topic geoObject, GeomapsService geomapsService) {
        this.topic = assignment.loadChildTopics();
        this.geoObject = new GeoObjectView(geoObject, geomapsService);
    }

    public AssignmentViewModel(Association angebot) {
        this.topic = angebot.loadChildTopics();
    }

    @Override
    public JSONObject toJSON() {
        try {
            json.put("id", topic.getId());
            json.put("name", geoObject.getName());
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

    private Long getStartDate() {
        Long value = new Long(-1);
        try {
            if (this.topic.hasProperty(KiezatlasAngebotPlugin.ANGEBOT_START_TIME)) {
                value = (Long) this.topic.getProperty(KiezatlasAngebotPlugin.ANGEBOT_START_TIME);
            }
            return value;
        } catch (Exception e) {
            throw new RuntimeException("Constructing an AssignmentViewModel failed", e);
        }
    }

    private Long getEndDate() {
        Long value = new Long(-1);
        try {
            if (this.topic.hasProperty(KiezatlasAngebotPlugin.ANGEBOT_END_TIME)) {
                value = (Long) this.topic.getProperty(KiezatlasAngebotPlugin.ANGEBOT_END_TIME);
            }
            return value;
        } catch (Exception e) {
            throw new RuntimeException("Constructing an AssignmentViewModel failed", e);
        }
    }

    private String getZusatzKontakt() {
        String value = null;
        try {
            if (this.topic.getChildTopics().has("ka2.angebot.assignment_kontakt")) {
                value = this.topic.getChildTopics().getString("ka2.angebot.assignment_kontakt");
            }
            return value;
        } catch (Exception e) {
            throw new RuntimeException("Constructing an AssignmentViewModel failed", e);
        }
    }

    private String getZusatzInfo() {
        String value = null;
        try {
            if (this.topic.getChildTopics().has("ka2.angebot.assignment_info")) {
                value = this.topic.getChildTopics().getString("ka2.angebot.assignment_info");
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
