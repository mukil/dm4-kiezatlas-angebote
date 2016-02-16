package de.kiezatlas.angebote.model;

import de.deepamehta.core.JSONEnabled;
import de.deepamehta.core.Topic;
import de.deepamehta.core.RelatedTopic;
import de.deepamehta.plugins.geomaps.GeomapsService;
import de.kiezatlas.angebote.AngebotService;
import de.kiezatlas.website.model.GeoObjectView;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.logging.Logger;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;
import java.util.List;

/**
 * A data transfer object as returned by the Kiezatlas Angebots service. ### Free us of the "dm4-kiezatlas-website"
 * dependency.
 */
public class AngebotViewModel implements JSONEnabled {

    // ---------------------------------------------------------------------------------------------- Instance Variables
    private JSONObject json = new JSONObject();
    private Topic topic = null;
    private Topic geoObjectTopic = null;
    private GeoObjectView geoObject = null; // contains coordinates, currently defused
    private Logger logger = Logger.getLogger(getClass().getName());

    // -------------------------------------------------------------------------------------------------- Public Methods
    public AngebotViewModel(Topic angebot, Topic geoObject, GeomapsService geomapsService, AngebotService angebote) {
        this.topic = angebot.loadChildTopics();
        this.geoObject = new GeoObjectView(geoObject, geomapsService, angebote);
    }

    public AngebotViewModel(Topic angebot, Topic geoObject) {
        this.topic = angebot.loadChildTopics();
        this.geoObjectTopic = geoObject;
    }

    public AngebotViewModel(Topic angebot) {
        this.topic = angebot.loadChildTopics();
    }

    @Override
    public JSONObject toJSON() {
        try {
            json.put("id", topic.getId());
            json.put("name", topic.getSimpleValue());
            json.put("beschreibung", getDescription());
            json.put("webpage", getWebpage());
            json.put("kontakt", getKontakt());
            json.put("geo_object", geoObjectTopic.toJSON());
            json.put("tags", getTags());
            return json;
        } catch (JSONException ex) {
            throw new RuntimeException("Constructing an AngebotViewModel failed", ex);
        }
    }

    // ----------------------------------------------------------------------------------------- Package Private Methods
    private String getDescription() {
        String value = null;
        try {
            if (this.topic.getChildTopics().has("ka2.angebot.beschreibung")) {
                value = this.topic.getChildTopics().getString("ka2.angebot.beschreibung");
            }
            return value;
        } catch (Exception e) {
            throw new RuntimeException("Constructing an AngebotViewModel failed", e);
        }
    }

    private String getWebpage() {
        String value = null;
        try {
            if (this.topic.getChildTopics().has("ka2.angebot.webpage")) {
                value = this.topic.getChildTopics().getString("ka2.angebot.webpage");
            }
            return value;
        } catch (Exception e) {
            throw new RuntimeException("Constructing an AngebotViewModel failed", e);
        }
    }

    private String getKontakt() {
        String value = null;
        try {
            if (this.topic.getChildTopics().has("ka2.angebot.kontakt")) {
                value = this.topic.getChildTopics().getString("ka2.angebot.kontakt");
            }
            return value;
        } catch (Exception e) {
            throw new RuntimeException("Constructing an AngebotViewModel failed", e);
        }
    }

    private JSONObject getGeoObject() {
        try {
            return geoObject.toJSON();
        } catch (Exception e) {
            throw new RuntimeException("Constructing an AngebotViewModel failed", e);
        }
    }

    private List<JSONObject> getTags() {
        List<JSONObject> tags = new ArrayList<JSONObject>();
        try {
            if (this.topic.getChildTopics().has("dm4.tags.tag")) {
                List<RelatedTopic> all = this.topic.getChildTopics().getTopics("dm4.tags.tag");
                Iterator<RelatedTopic> iterator = all.iterator();
                while (iterator.hasNext()) {
                    Topic tag = iterator.next();
                    JSONObject dto = new JSONObject().put("label", tag.getSimpleValue()).put("id", tag.getId());
                    tags.add(dto);
                }
            }
            return tags;
        } catch (Exception e) {
            throw new RuntimeException("Constructing an AngebotViewModel failed", e);
        }
    }

}
