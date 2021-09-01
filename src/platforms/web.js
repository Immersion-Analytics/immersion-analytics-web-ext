
export const IAWebPlatformId = 'web';

export class IAWebPlatform {
    constructor() {
        this.id = IAWebPlatformId;
    }

    init(ia, callbacks) {
        callbacks.onInitialized();
    }

    openDialog(url, options) {
        window.location = url;
    }

    getDataSourcesAsync() {
        // Web platform has no data sources
        return new Promise(resolve => {
            resolve([]);
        });
    }

    createTableForDataSource() {
    }

    saveSettings(settings) {
    }

}