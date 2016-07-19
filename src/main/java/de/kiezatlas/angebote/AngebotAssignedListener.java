package de.kiezatlas.angebote;

import de.deepamehta.core.Association;
import de.deepamehta.core.Topic;
import de.deepamehta.core.service.EventListener;

/**
 *
 * @author malted
 */
public interface AngebotAssignedListener extends EventListener {
    
    void angebotsInfoAssigned(Topic angebotsInfo, Topic geoObject, Association assignment);
    
}
