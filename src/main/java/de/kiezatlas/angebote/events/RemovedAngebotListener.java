package de.kiezatlas.angebote.events;

import de.deepamehta.core.Association;
import de.deepamehta.core.Topic;
import de.deepamehta.core.service.EventListener;

/**
 *
 * @author malted
 */
public interface RemovedAngebotListener extends EventListener {
    
    void angebotsInfoAssignmentRemoved(Topic angebotsInfo, Topic geoObject, Association assignment, String username);
    
}
