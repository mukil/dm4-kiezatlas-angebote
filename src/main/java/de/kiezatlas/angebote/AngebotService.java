package de.kiezatlas.angebote;

import de.deepamehta.core.RelatedTopic;
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
     * @return      List of all "Angebotsinfos" related to all the given Geo Objects
     * (given a JSON Array with Topic IDs).
     */
    List<RelatedTopic> getGeoObjectAngeboteTopics(String payloadListing);

}
