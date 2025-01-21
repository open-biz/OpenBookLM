export const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export const loadGoogleDriveApi = () => {
  return new Promise<void>((resolve, reject) => {
    // Check if the API is already loaded
    if (
      typeof window !== "undefined" &&
      typeof (window as any).gapi !== "undefined" &&
      (window as any).gapi.client
    ) {
      resolve();
      return;
    }

    // Load the Google API script
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.onload = () => {
      (window as any).gapi.load("client:auth2:picker", async () => {
        try {
          await (window as any).gapi.client.init({
            apiKey: GOOGLE_API_KEY!,
            clientId: GOOGLE_CLIENT_ID!,
            scope: "https://www.googleapis.com/auth/drive.readonly",
          });
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    };
    script.onerror = reject;
    document.body.appendChild(script);
  });
};
