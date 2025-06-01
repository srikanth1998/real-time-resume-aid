
// Chrome extension API type definitions
declare global {
  interface Window {
    chrome?: {
      runtime?: {
        id?: string;
        onMessage?: {
          addListener: (callback: (message: any, sender: any, sendResponse: any) => void) => void;
        };
        sendMessage?: (message: any, responseCallback?: (response: any) => void) => void;
      };
      tabs?: {
        query: (queryInfo: any) => Promise<any[]>;
        sendMessage: (tabId: number, message: any) => Promise<any>;
      };
      storage?: {
        local?: {
          get: (keys: string | string[] | null) => Promise<any>;
          set: (items: any) => Promise<void>;
        };
      };
    };
  }
}

// Make chrome available globally
declare const chrome: Window['chrome'];

export {};
