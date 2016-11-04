package de.kiezatlas.angebote.model;

import de.deepamehta.core.JSONEnabled;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.codehaus.jettison.json.JSONArray;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;

/**
 *
 * @author malted
 */
public class Angebotsinfos implements JSONEnabled {
    
    public JSONObject json = null;
    // DateFormat df = new SimpleDateFormat("DD.MM.YYYY");

    public Angebotsinfos() {
        json = new JSONObject();
    }

    public String getName() {
        try {
            return json.getString("name");
        } catch (JSONException ex) {
            Logger.getLogger(Angebotsinfos.class.getName()).log(Level.SEVERE, null, ex);
        }
        return null;
    }
   
    public void setName(String nameValue) {
        try {
            json.put("name", nameValue);
        } catch (JSONException ex) {
            Logger.getLogger(Angebotsinfos.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public void setContact(String kontaktValue) {
        try {
            json.put("kontakt", kontaktValue);
        } catch (JSONException ex) {
            Logger.getLogger(Angebotsinfos.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public void setAngebotsinfoCreator(String username) {
        try {
            json.put("creator", username);
        } catch (JSONException ex) {
            Logger.getLogger(Angebotsinfos.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public void setWebpage(String webpageValue) {
        try {
            json.put("webpage", webpageValue);
        } catch (JSONException ex) {
            Logger.getLogger(Angebotsinfos.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public void setDescription(String descriptionValue) {
        try {
            json.put("beschreibung", descriptionValue);
        } catch (JSONException ex) {
            Logger.getLogger(Angebotsinfos.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public void setId(long id) {
        try {
            json.put("id", id);
        } catch (JSONException ex) {
            Logger.getLogger(Angebotsinfos.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public void setLocations(JSONArray locations) {
        try {
            json.put("locations", locations);
        } catch (JSONException ex) {
            Logger.getLogger(Angebotsinfos.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public void setTags(List<JSONObject> tags) {
        try {
            json.put("tags", tags);
        } catch (Exception e) {
            throw new RuntimeException("Constructing an AngebotViewModel failed", e);
        }
    }

    public JSONObject toJSON() {
        return json;
    }

    @Override
    public boolean equals(Object obj) {
        boolean equal = false;
        if (obj instanceof Angebotsinfos) {
            equal = (this.getId() == ((Angebotsinfos) obj).getId());
        }
        return equal;
    }

    @Override
    public int hashCode() {
        int hash = 7;
        hash = 29 * hash + (this.json != null ? this.json.hashCode() : 0);
        return hash;
    }

    // --- Thymeleaf Getters ---

    public long getId() {
        try {
            return json.getLong("id");
        } catch (JSONException ex) {
            Logger.getLogger(Angebotsinfos.class.getName()).log(Level.SEVERE, null, ex);
        }
        return -1;
    }

}
