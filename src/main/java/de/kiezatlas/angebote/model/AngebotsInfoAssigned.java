package de.kiezatlas.angebote.model;

import de.deepamehta.core.JSONEnabled;
import java.text.DateFormat;
import java.util.Locale;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;



/**
 * A data transfer object as returned by the Kiezatlas Angebots service.
 * ### Free us of the "dm4-kiezatlas-website" dependency.
 */
public class AngebotsInfoAssigned implements JSONEnabled {

    private JSONObject json = null;

    public AngebotsInfoAssigned() {
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
            throw new RuntimeException("Constructing a LocationAssignmentModel failed", ex);
        }
    }

    public void setAssignmentId(long assocId) {
        try {
            json.put("id", assocId);
        } catch (JSONException ex) {
            throw new RuntimeException("Constructing a LocationAssignmentModel failed", ex);
        }
    }

    public void setGeoObjectId(String institutionId) {
        try {
            json.put("location_id", institutionId);
        } catch (Exception e) {
            throw new RuntimeException("Constructing a LocationAssignmentModel failed", e);
        }
    }

    /** public void setDistanceInMeter(String meter) {
        try {
            json.put("distanz", meter);
        } catch (Exception e) {
            throw new RuntimeException("Constructing a SocialOfferObject failed", e);
        }
    }

    public void setGeoCoordinate(GeoCoordinate geoCoord) {
        try {
            JSONObject geolocation = new JSONObject();
            geolocation.put("lon", geoCoord.lon);
            geolocation.put("lat", geoCoord.lat);
            //
            json.put("geolocation", geolocation);
        } catch (Exception e) {
            throw new RuntimeException("Constructing a SocialOfferObject failed", e);
        }
    }

    public void setAddress(String address) {
        try {
            json.put("anschrift", address);
        } catch (Exception e) {
            throw new RuntimeException("Constructing a SocialOfferObject failed", e);
        }
    }
    **/

    public void setAdditionalInfo(String value) {
        try {
            json.put("zusatzinfo", value);
        } catch (JSONException ex) {
            throw new RuntimeException("Constructing a LocationAssignmentModel failed", ex);
        }
    }

    public void setContact(String webpageValue) {
        try {
            json.put("kontakt", webpageValue);
        } catch (JSONException ex) {
            throw new RuntimeException("Constructing a LocationAssignmentModel failed", ex);
        }
    }

    public void setStartDate(long fromDate) {
        try {
            json.put("anfang_timestamp", fromDate);
            json.put("anfang", DateFormat.getDateInstance(DateFormat.LONG, Locale.GERMANY).format(fromDate));
        } catch (JSONException ex) {
            throw new RuntimeException("Constructing a LocationAssignmentModel failed", ex);
        }
    }

    public void setEndDate(long toDate) {
        try {
            json.put("ende_timestamp", toDate);
            json.put("ende", DateFormat.getDateInstance(DateFormat.LONG, Locale.GERMAN).format(toDate));
        } catch (JSONException ex) {
            throw new RuntimeException("Constructing a LocationAssignmentModel failed", ex);
        }
    }

}
