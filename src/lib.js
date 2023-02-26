import {useEffect, useState} from "react";

// Used to notify panels that they are a opened as a sub-dialog of the application
// e.g. Used in Tableau platform to disable dataset binding management in dialogs
export const DialogModeHash = "#dialog";

/** React Hook to get value of the IA model property returned by getter().
 * Refreshes component when property value changes.
 * If getter throws an exception, returned value will be set to undefined.
 */
export function usePropertyValue(getter, undefinedValue, onChanged) {
    const propertyValue = useIAObject(getter)?.value;
    return propertyValue === undefined ? undefinedValue : propertyValue;
}

/** React Hook to bind to any changes to the IA scene graph object returned by getter().
 * Refreshes component when the object's onChanged() event fires.
 * If getter throws an exception, returned value will be set to undefined.
 */
export function useIAObject(getter) {
    let iaObject;
    try {
        iaObject = getter();
    } catch {}

    const [, setRefresh] = useState();
    const objectId = iaObject?._netWrapper._id;

    useEffect(() => {
        setRefresh({});

        if (!iaObject)
            return;
        return iaObject.onChanged(() => {
            setRefresh({});     // must create a new object to force React to see it as a value change.
        });

    }, [objectId]);

    return iaObject;
}



export function getPanelUrl(platformId, panelId) {
    let url = `/${platformId}-${panelId}`;
    if (window.location.hash === DialogModeHash)
        url += DialogModeHash;

    return url;
}

export function getParentPath(path) {
    return path.substring(0, path.lastIndexOf('/'));
}

/** Like JSON.parse(), but does not throw an exception */
export function parseJSON(jsonStr) {
    try {
        return JSON.parse(jsonStr);
    }
    catch (error) {
        return null;
    }
}


export function NotFoundPage(type) {
    if (!type)
        type = "Page";

    return <h3>{type} not found</h3>
}