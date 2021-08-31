import {useEffect, useState} from "react";

/** React Hook to get value of the IA model property returned by getter().
 * Refreshes component when property value changes.
 * If getter throws an exception, returned value will be set to undefined.
 */
export function usePropertyValue(getter, initialValue) {
    const [propertyValue, setPropertyValue] = useState(initialValue);

    useEffect(() => {
        try {
            const property = getter();
            return property.onChanged(() => {
                setPropertyValue(property.value)
            });
        } catch {
            setPropertyValue(undefined);
        }
    });
    return propertyValue;
}

export function getPanelUrl(platformId, panelId) {
    return `/${platformId}-${panelId}`;
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