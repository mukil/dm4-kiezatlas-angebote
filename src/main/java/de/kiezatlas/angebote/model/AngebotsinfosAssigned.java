package de.kiezatlas.angebote.model;

import de.deepamehta.core.JSONEnabled;
import java.text.DateFormat;
import java.util.Locale;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;



/**
 * A data transfer object as returned by the Kiezatlas Angebots service.
 * ### Free us of the "dm4-kiezatlas-website" dependency.
 */
public class AngebotsinfosAssigned implements JSONEnabled {

    private JSONObject json = null;

    public AngebotsinfosAssigned() {
        json = new JSONObject();
    }

    @Override
    public JSONObject toJSON() {
        return json;
    }

    // ----------------------------------------------------------------------------------------- Package Private Methods

    public void setLocationName(String nameValue) {
        try {
            json.put("name", nameValue);
        } catch (JSONException ex) {
            throw new RuntimeException("Constructing a AngebotsInfoAssigned failed", ex);
        }
    }

    public void setLocationId(long id) {
        try {
            json.put("locationId", id);
        } catch (JSONException ex) {
            throw new RuntimeException("Constructing a AngebotsInfoAssigned failed", ex);
        }
    }

    public void setLocationAddress(String addressString) {
        try {
            json.put("address", addressString);
        } catch (JSONException ex) {
            throw new RuntimeException("Constructing a AngebotsInfoAssigned failed", ex);
        }
    }

    public void setLocationCoordinates(double latitude, double longitude) {
        try {
            json.put("latitude", latitude);
            json.put("longitude", longitude);
        } catch (JSONException ex) {
            throw new RuntimeException("Constructing a AngebotsInfoAssigned failed", ex);
        }
    }

    public void setAngebotsName(String nameValue) {
        try {
            json.put("angebotsName", nameValue);
        } catch (JSONException ex) {
            throw new RuntimeException("Constructing a AngebotsInfoAssigned failed", ex);
        }
    }

    public void setAngebotsId(long assocId) {
        try {
            json.put("angebotsId", assocId);
        } catch (JSONException ex) {
            throw new RuntimeException("Constructing a AngebotsInfoAssigned failed", ex);
        }
    }

    public void setAssignmentId(long assocId) {
        try {
            json.put("id", assocId);
        } catch (JSONException ex) {
            throw new RuntimeException("Constructing a AngebotsInfoAssigned failed", ex);
        }
    }

    public void setGeoObjectId(String institutionId) {
        try {
            json.put("location_id", institutionId);
        } catch (Exception e) {
            throw new RuntimeException("Constructing a AngebotsInfoAssigned failed", e);
        }
    }

    public void setKontakt(String nameValue) {
        try {
            json.put("kontakt", nameValue);
        } catch (JSONException ex) {
            throw new RuntimeException("Constructing a AngebotsInfoAssigned failed", ex);
        }
    }

    public void setAdditionalInfo(String value) {
        try {
            json.put("zusatzinfo", value);
        } catch (JSONException ex) {
            throw new RuntimeException("Constructing a AngebotsInfoAssigned failed", ex);
        }
    }

    public void setAdditionalContact(String webpageValue) {
        try {
            json.put("zusatzkontakt", webpageValue);
        } catch (JSONException ex) {
            throw new RuntimeException("Constructing a AngebotsInfoAssigned failed", ex);
        }
    }

    public void setDescription(String webpageValue) {
        try {
            json.put("beschreibung", webpageValue);
        } catch (JSONException ex) {
            throw new RuntimeException("Constructing a AngebotsInfoAssigned failed", ex);
        }
    }

    public void setWebpage(String webpageValue) {
        try {
            json.put("webpage", webpageValue);
        } catch (JSONException ex) {
            throw new RuntimeException("Constructing a AngebotsInfoAssigned failed", ex);
        }
    }

    public void setAngebotsinfoCreator(String username) {
        try {
            json.put("creator", username);
        } catch (JSONException ex) {
            throw new RuntimeException("Constructing a AngebotsInfoAssigned failed", ex);
        }
    }

    public void setStartDate(long fromDate) {
        try {
            json.put("anfang_timestamp", fromDate);
            json.put("anfang", DateFormat.getDateInstance(DateFormat.LONG, Locale.GERMANY).format(fromDate));
        } catch (JSONException ex) {
            throw new RuntimeException("Constructing a AngebotsInfoAssigned failed", ex);
        }
    }

    public void setEndDate(long toDate) {
        try {
            json.put("ende_timestamp", toDate);
            json.put("ende", DateFormat.getDateInstance(DateFormat.LONG, Locale.GERMAN).format(toDate));
        } catch (JSONException ex) {
            throw new RuntimeException("Constructing a AngebotsInfoAssigned failed", ex);
        }
    }

    /** setAssignedUsername, setLastModified **/

    /** ------------------- Public Thymeleaf Getter -------------------- **/

    public String getLocationName() {
        try {
            return json.getString("name");
        } catch (JSONException ex) {
            Logger.getLogger(AngebotsinfosAssigned.class.getName()).log(Level.FINE, "AngebotsInfoAssigned has no LocationName", ex);
            return "";
        }
    }

    public long getLocationId() {
        try {
            return json.getLong("locationId");
        } catch (JSONException ex) {
            Logger.getLogger(AngebotsinfosAssigned.class.getName()).log(Level.FINE, "AngebotsInfoAssigned has no LocationName", ex);
            return -1;
        }
    }

    public String getLocationAddress() {
        try {
            return json.getString("address");
        } catch (JSONException ex) {
            Logger.getLogger(AngebotsinfosAssigned.class.getName()).log(Level.FINE, "AngebotsInfoAssigned has no LocationName", ex);
            return "";
        }
    }

    public String getLocationLatitude() {
        try {
            return json.getString("latitude");
        } catch (JSONException ex) {
            Logger.getLogger(AngebotsinfosAssigned.class.getName()).log(Level.FINE, "AngebotsInfoAssigned has no Location Latitude", ex);
            return "";
        }
    }

    public String getLocationLongitude() {
        try {
            return json.getString("longitude");
        } catch (JSONException ex) {
            Logger.getLogger(AngebotsinfosAssigned.class.getName()).log(Level.FINE, "AngebotsInfoAssigned has no Location Longitude", ex);
            return "";
        }
    }

    public String getAngebotsinfoCreator() {
        try {
            return json.getString("creator");
        } catch (JSONException ex) {
            Logger.getLogger(AngebotsinfosAssigned.class.getName()).log(Level.FINE, "AngebotsInfoAssigned has no Angebotsinfo Creator", ex);
            return "";
        }
    }

    public String getAngebotsName() {
        try {
            return json.getString("angebotsName");
        } catch (JSONException ex) {
            Logger.getLogger(AngebotsinfosAssigned.class.getName()).log(Level.FINE, "AngebotsInfoAssigned has no AngebotsName", ex);
            return "";
        }
    }

    public String getWebpage() {
        try {
            return json.getString("webpage");
        } catch (JSONException ex) {
            Logger.getLogger(AngebotsinfosAssigned.class.getName()).log(Level.FINE, "AngebotsInfoAssigned has no AngebotsName", ex);
            return "";
        }
    }

    public String getAngebotsId() {
        try {
            return json.getString("angebotsId");
        } catch (JSONException ex) {
            Logger.getLogger(AngebotsinfosAssigned.class.getName()).log(Level.FINE, "AngebotsInfoAssigned has no Id", ex);
            return "";
        }
    }

    public String getStartDate() {
        try {
            return json.getString("anfang");
        } catch (JSONException ex) {
            Logger.getLogger(AngebotsinfosAssigned.class.getName()).log(Level.FINE, "AngebotsInfoAssigned has no StartDate", ex);
            return "";
        }
    }

    public String getEndDate() {
        try {
            return json.getString("ende");
        } catch (JSONException ex) {
            Logger.getLogger(AngebotsinfosAssigned.class.getName()).log(Level.FINE, "AngebotsInfoAssigned has no EndDate", ex);
            return "";
        }
    }

    public String getDescription() {
        try {
            return json.getString("beschreibung");
        } catch (JSONException ex) {
            Logger.getLogger(AngebotsinfosAssigned.class.getName()).log(Level.FINE, "AngebotsInfoAssigned has no EndDate", ex);
            return "";
        }
    }

    public String getKontakt() {
        try {
            return json.getString("kontakt");
        } catch (JSONException ex) {
            Logger.getLogger(AngebotsinfosAssigned.class.getName()).log(Level.FINE, "AngebotsInfoAssigned has no Kontakt", ex);
            return "";
        }
    }

    public String getAdditionalInfo() {
        try {
            return json.getString("zusatzinfo");
        } catch (JSONException ex) {
            Logger.getLogger(AngebotsinfosAssigned.class.getName()).log(Level.FINE, "AngebotsInfoAssigned has no EndDate", ex);
            return "";
        }
    }

    public String getAdditionalContact() {
        try {
            return json.getString("zusatzkontakt");
        } catch (JSONException ex) {
            Logger.getLogger(AngebotsinfosAssigned.class.getName()).log(Level.FINE, "AngebotsInfoAssigned has no EndDate", ex);
            return "";
        }
    }

    @Override
    public boolean equals(Object obj) {
        boolean equal = false;
        if (obj instanceof AngebotsinfosAssigned) {
            equal = (this.getId() == ((AngebotsinfosAssigned) obj).getId());
        }
        return equal;
    }

    public long getId() {
        return Long.parseLong(getAngebotsId());  // ### should be getAssignmentId()...
    }

}
