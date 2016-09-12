package de.kiezatlas.angebote.model;

import de.deepamehta.core.JSONEnabled;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.codehaus.jettison.json.JSONArray;
import org.codehaus.jettison.json.JSONException;
import org.codehaus.jettison.json.JSONObject;

public class AngeboteSearchResults implements JSONEnabled {
    
    JSONObject results = new JSONObject();
    
    public AngeboteSearchResults() {
        try {
            results.put("overall", new JSONArray());
            results.put("assigned", new JSONArray());
        } catch (JSONException ex) {
            Logger.getLogger(AngeboteSearchResults.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public void setOverallAngebote(List<Angebotsinfos> infos) {
        try {
            if (infos != null) {
                JSONArray overall = results.getJSONArray("overall");
                for (Angebotsinfos info : infos) {
                    JSONObject item = info.toJSON();
                    overall.put(item);
                }
            }
        } catch (JSONException ex) {
            Logger.getLogger(AngeboteSearchResults.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public void addToOverallAngebote(Angebotsinfos info) {
        try {
            if (info != null) {
                JSONArray overall = results.getJSONArray("overall");
                overall.put(info.toJSON());
            }
        } catch (JSONException ex) {
            Logger.getLogger(AngeboteSearchResults.class.getName()).log(Level.SEVERE, null, ex);
        }
    }
    
    public void setAssignedAngebote(List<AngebotsinfosAssigned> infos) {
        try {
            if (infos != null) {
                JSONArray overall = results.getJSONArray("assigned");
                for (AngebotsinfosAssigned info : infos) {
                    JSONObject item = info.toJSON();
                    overall.put(item);
                }
            }
        } catch (JSONException ex) {
            Logger.getLogger(AngeboteSearchResults.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public void addToAssignedAngebote(AngebotsinfosAssigned info) {
        try {
            if (info != null) {
                JSONArray assigned = results.getJSONArray("assigned");
                assigned.put(info.toJSON());
            }
        } catch (JSONException ex) {
            Logger.getLogger(AngeboteSearchResults.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    @Override
    public JSONObject toJSON () {
        return results;
    }
    
}
