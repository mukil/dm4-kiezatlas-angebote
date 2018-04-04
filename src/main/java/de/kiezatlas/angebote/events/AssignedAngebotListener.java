package de.kiezatlas.angebote.events;

import de.deepamehta.core.Association;
import de.deepamehta.core.Topic;
import de.deepamehta.core.service.EventListener;

/**
 *
 * @author malted
 */
public interface AssignedAngebotListener extends EventListener {
    
    void angebotsInfoAssigned(Topic angebotsInfo, Topic geoObject, Association assignment);
    
}
