package de.kiezatlas.angebote;

import de.deepamehta.core.RelatedTopic;
import de.deepamehta.core.Topic;
import de.deepamehta.core.service.ResultList;
import de.kiezatlas.angebote.model.AngebotViewModel;
import java.util.List;



public interface AngebotService {
    
    /**
     * @return      Details for a specific "Angebotsinfo" topic ID relating to the requesting user.
     */
    AngebotViewModel getUsersAngebotsinfo(long angebotsInfoId);

    /**
     * 
     * @return      List of all "Angebotsinfos" for the requesting user.
     */
    List<RelatedTopic> getUsersAngeboteTopics();

    /**
     * @return      List of all "Angebotsinfos" related to the given Geo Object (typeUri="ka2.geo_object").
     */
    ResultList<RelatedTopic> getGeoObjectAngeboteTopics(long geoObjectId);

    /**
     * @return      List of all "Angebotsinfos" related to the given Geo Object (typeUri="ka2.geo_object").
     */
    ResultList<RelatedTopic> getGeoObjectAngeboteTopics(Topic geoObject);

    /**
     * @return      List of all "Angebotsinfos" related to all the given Geo Objects
     * (given a JSON Array with Topic IDs).
     */
    List<RelatedTopic> getGeoObjectAngeboteTopics(String payloadListing);

    /**
     * Fetches all Angebotsinfos with a _current_ (now > from && now < to) Geo Object Assignment.
     * @param now
     * @return
     */
    List<AngebotViewModel> getAllAngebotsinfosByNow(long now);

    /**
     * Fetches all Angebotsinfos by searching four child types: Name, Beschreibung, Kontakt und Tags.
     * @param query
     * @return
     */
    List<AngebotViewModel> searchAngebotsinfosByText(String query);

}
