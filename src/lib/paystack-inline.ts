declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: {
        key: string;
        email: string;
        amount: number;
        currency?: string;
        ref?: string;
        metadata?: any;
        channels?: string[];
        callback: (response: { reference: string; status?: string; message?: string }) => void;
        onClose: () => void;
      }) => { openIframe: () => void };
    };
  }
}

export interface PaystackInlineConfig {
  key: string;
  email: string;
  amountGhs: number;
  reference: string;
  metadata?: Record<string, any>;
  onSuccess: (reference: string) => void;
  onClose: () => void;
}

let scriptLoadingPromise: Promise<void> | null = null;

function loadPaystackScript(): Promise<void> {
  if (window.PaystackPop) {
    return Promise.resolve();
  }
  if (scriptLoadingPromise) {
    return scriptLoadingPromise;
  }

  scriptLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptLoadingPromise = null;
      reject(new Error("Failed to load Paystack Inline Checkout SDK script."));
    };
    document.body.appendChild(script);
  });

  return scriptLoadingPromise;
}

export async function openPaystackInlineCheckout(config: PaystackInlineConfig): Promise<void> {
  await loadPaystackScript();

  if (!window.PaystackPop) {
    throw new Error("Paystack SDK not initialized.");
  }

  const amountPesewas = Math.round(config.amountGhs * 100);

  const handler = window.PaystackPop.setup({
    key: config.key,
    email: config.email,
    amount: amountPesewas,
    currency: "GHS",
    ref: config.reference,
    metadata: config.metadata,
    channels: ["mobile_money", "card"],
    callback: (response) => {
      config.onSuccess(response.reference || config.reference);
    },
    onClose: () => {
      config.onClose();
    },
  });

  handler.openIframe();
}
