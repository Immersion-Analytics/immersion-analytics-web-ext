
export const IAWebPlatformId = 'web';

export class IAWebPlatform {
    constructor() {
        this.id = IAWebPlatformId;

    }

    init(ia, onInitialized) {
        onInitialized();
    }

    openDialog(url, options) {
        window.location = url;
    }

}