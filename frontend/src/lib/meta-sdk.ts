declare global {
  interface Window {
    fbAsyncInit?: () => void;
    FB?: {
      init: (opts: Record<string, unknown>) => void;
      login: (
        cb: (response: {
          authResponse?: { code?: string; accessToken?: string };
          status?: string;
        }) => void,
        opts: Record<string, unknown>,
      ) => void;
    };
  }
}

export type MetaSessionData = {
  phoneNumberId?: string;
  wabaId?: string;
  event?: string;
};

export function loadFacebookSdk(appId: string, graphVersion: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('window missing'));
  if (window.FB) {
    window.FB.init({
      appId,
      autoLogAppEvents: true,
      xfbml: false,
      version: graphVersion.startsWith('v') ? graphVersion : `v${graphVersion}`,
    });
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    window.fbAsyncInit = () => {
      try {
        window.FB?.init({
          appId,
          autoLogAppEvents: true,
          xfbml: false,
          version: graphVersion.startsWith('v') ? graphVersion : `v${graphVersion}`,
        });
        resolve();
      } catch (e) {
        reject(e);
      }
    };

    const existing = document.getElementById('facebook-jssdk');
    if (existing) {
      // sdk loading — wait briefly for FB
      const start = Date.now();
      const timer = setInterval(() => {
        if (window.FB) {
          clearInterval(timer);
          window.fbAsyncInit?.();
        } else if (Date.now() - start > 12000) {
          clearInterval(timer);
          reject(new Error('انتهت مهلة تحميل Facebook SDK'));
        }
      }, 100);
      return;
    }

    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.onerror = () => reject(new Error('فشل تحميل Facebook SDK'));
    document.body.appendChild(script);
  });
}

export function listenEmbeddedSignupSession(onSession: (data: MetaSessionData) => void) {
  const handler = (event: MessageEvent) => {
    if (typeof event.origin !== 'string' || !event.origin.endsWith('facebook.com')) return;
    try {
      const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      if (data?.type !== 'WA_EMBEDDED_SIGNUP') return;
      const payload = data.data || {};
      onSession({
        event: data.event,
        phoneNumberId: payload.phone_number_id || payload.phoneNumberId,
        wabaId: payload.waba_id || payload.wabaId,
      });
    } catch {
      /* ignore non-json */
    }
  };
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}

export function launchWhatsAppEmbeddedSignup(configId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!window.FB) {
      reject(new Error('Facebook SDK غير جاهز'));
      return;
    }
    window.FB.login(
      (response) => {
        const code = response.authResponse?.code;
        if (code) resolve(code);
        else reject(new Error('تم إلغاء تسجيل الدخول أو لم يُرجع فيسبوك رمزاً'));
      },
      {
        config_id: configId,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {},
          sessionInfoVersion: '3',
        },
      },
    );
  });
}
