"use client";

export interface GoogleFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  iconLink: string;
  modifiedTime: string;
}

// Load Google Picker API
const loadPickerApi = () => {
  return new Promise<void>((resolve, reject) => {
    if ((window as any).google?.picker) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src =
      "https://apis.google.com/js/api.js?key=" +
      process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    script.onload = () => {
      (window as any).gapi.load("picker", { callback: resolve });
    };
    script.onerror = reject;
    document.body.appendChild(script);
  });
};

// Initialize Google API client
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
      (window as any).gapi.load("client:auth2", async () => {
        try {
          await (window as any).gapi.client.init({
            clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
            scope: [
              "https://www.googleapis.com/auth/drive.file",
              "https://www.googleapis.com/auth/drive.readonly",
              "email",
              "profile",
            ].join(" "),
            plugin_name: "Openbooklm",
          });

          // Load the picker API after gapi is initialized
          await loadPickerApi();
          resolve();
        } catch (error) {
          console.error("Google API initialization error:", error);
          reject(error);
        }
      });
    };
    script.onerror = (error) => {
      console.error("Failed to load Google API script:", error);
      reject(error);
    };
    document.body.appendChild(script);
  });
};

export const createPicker = (token: string, callback: (file: any) => void) => {
  if (!(window as any).google?.picker) {
    console.error("Google Picker API not loaded");
    return;
  }

  const view = new (window as any).google.picker.View(
    (window as any).google.picker.ViewId.DOCS
  );
  view.setMimeTypes(
    "application/pdf,text/plain,application/vnd.google-apps.document"
  );

  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
  overlay.style.pointerEvents = "none";
  document.body.appendChild(overlay);

  const removeOverlay = () => {
    if (document.body.contains(overlay)) {
      document.body.removeChild(overlay);
    }
  };

  const picker = new (window as any).google.picker.PickerBuilder()
    .addView(view)
    .setOAuthToken(token)
    .setDeveloperKey(process.env.NEXT_PUBLIC_GOOGLE_API_KEY)
    .setCallback((data: any) => {
      if (data.action === (window as any).google.picker.Action.PICKED) {
        callback(data.docs[0]);
      }
      // Remove overlay when picker is closed or cancelled
      if (
        data.action === (window as any).google.picker.Action.CANCEL ||
        data.action === (window as any).google.picker.Action.PICKED
      ) {
        removeOverlay();
      }
    })
    .build();

  picker.setVisible(true);

  // Cleanup if the window is closed in other ways
  window.addEventListener("beforeunload", removeOverlay);

  // Remove the event listener when component unmounts
  return () => {
    window.removeEventListener("beforeunload", removeOverlay);
    removeOverlay();
  };
};

export const getGoogleToken = async (): Promise<string> => {
  try {
    const auth = await (window as any).gapi.auth2.getAuthInstance();
    if (!auth.isSignedIn.get()) {
      await auth.signIn();
    }
    return auth.currentUser.get().getAuthResponse().access_token;
  } catch (error) {
    console.error("Error getting Google token:", error);
    throw error;
  }
};

export const listFiles = async (token: string): Promise<GoogleFile[]> => {
  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?pageSize=30&fields=files(id,name,mimeType,webViewLink,iconLink,modifiedTime)&orderBy=modifiedTime desc`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error("Error listing files:", error);
    return [];
  }
};

export const downloadFile = async (
  fileId: string,
  token: string
): Promise<Blob> => {
  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return await response.blob();
  } catch (error) {
    console.error("Error downloading file:", error);
    throw error;
  }
};
