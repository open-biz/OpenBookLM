interface Window {
  gapi: {
    load: (apiName: string, callback: () => void) => void;
    client: {
      init: (config: {
        apiKey: string;
        clientId: string;
        scope: string;
        discoveryDocs: string[];
      }) => Promise<void>;
      drive: {
        files: {
          list: (params: any) => Promise<any>;
          get: (params: any) => Promise<any>;
        };
      };
    };
    auth2: {
      getAuthInstance: () => {
        isSignedIn: {
          get: () => boolean;
        };
        signIn: () => Promise<void>;
        currentUser: {
          get: () => {
            getAuthResponse: () => {
              access_token: string;
            };
          };
        };
      };
    };
  };
}
