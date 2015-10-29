package de.kiezatlas.angebote.model;

import de.deepamehta.core.JSONEnabled;
import de.deepamehta.core.Topic;
import de.deepamehta.plugins.geomaps.service.GeomapsService;
import de.kiezatlas.website.model.MapEntryView;
import java.util.logging.Logger;
import org.codehaus.jettison.json.JSONException;

import org.codehaus.jettison.json.JSONObject;



/**
 * A data transfer object as returned by the Kiezatlas Angebots service.
 * ### Free us of the "dm4-kiezatlas-website" dependency.
 */
public class AngebotViewModel implements JSONEnabled {

    // ---------------------------------------------------------------------------------------------- Instance Variables

    private JSONObject json = new JSONObject();
    private Topic topic = null;
	private MapEntryView geoObject = null;
	private Logger logger = Logger.getLogger(getClass().getName());

    // -------------------------------------------------------------------------------------------------- Public Methods
	
	public AngebotViewModel(Topic angebot, Topic geoObject, GeomapsService geomapsService) {
		this.topic = angebot.loadChildTopics();
		this.geoObject= new MapEntryView(geoObject, geomapsService);
	}

    @Override
    public JSONObject toJSON() {
		try {
			json.put("id", topic.getId());
			json.put("name", topic.getSimpleValue());
			json.put("beschreibung", getDescription());
			json.put("website", getWebpage());
			json.put("kontakt", getKontakt());
			json.put("geo_object", getGeoObject());
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

	private JSONObject getTags() {
		JSONObject tags = null;
        try {
			// ### logger.info("Tags for AngebotViewModel=" + this.topic.getChildTopics().getTopics("dm4.tags.tag").toString());
            return tags;
        } catch (Exception e) {
            throw new RuntimeException("Constructing an AngebotViewModel failed", e);
        }
    }

}
