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
            results.put("fulltext", new JSONArray());
            results.put("spatial", new JSONArray());
            results.put("timely", new JSONArray());
        } catch (JSONException ex) {
            Logger.getLogger(AngeboteSearchResults.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public void setFulltextResults(List<Angebotsinfos> infos) {
        try {
            if (infos != null) {
                JSONArray overall = results.getJSONArray("fulltext");
                for (Angebotsinfos info : infos) {
                    JSONObject item = info.toJSON();
                    overall.put(item);
                }
            }
        } catch (JSONException ex) {
            Logger.getLogger(AngeboteSearchResults.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public void addToFulltextResults(Angebotsinfos info) {
        try {
            if (info != null) {
                JSONArray overall = results.getJSONArray("fulltext");
                overall.put(info.toJSON());
            }
        } catch (JSONException ex) {
            Logger.getLogger(AngeboteSearchResults.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public void setTimelyResults(List<Angebotsinfos> infos) {
        try {
            if (infos != null) {
                JSONArray overall = results.getJSONArray("timely");
                for (Angebotsinfos info : infos) {
                    JSONObject item = info.toJSON();
                    overall.put(item);
                }
            }
        } catch (JSONException ex) {
            Logger.getLogger(AngeboteSearchResults.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public void addToTimelyResults(Angebotsinfos info) {
        try {
            if (info != null) {
                JSONArray overall = results.getJSONArray("timely");
                overall.put(info.toJSON());
            }
        } catch (JSONException ex) {
            Logger.getLogger(AngeboteSearchResults.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public void setSpatialResults(List<AngebotsinfosAssigned> infos) {
        try {
            if (infos != null) {
                JSONArray overall = results.getJSONArray("spatial");
                for (AngebotsinfosAssigned info : infos) {
                    JSONObject item = info.toJSON();
                    overall.put(item);
                }
            }
        } catch (JSONException ex) {
            Logger.getLogger(AngeboteSearchResults.class.getName()).log(Level.SEVERE, null, ex);
        }
    }

    public void addToSpatialResults(AngebotsinfosAssigned info) {
        try {
            if (info != null) {
                JSONArray assigned = results.getJSONArray("spatial");
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
