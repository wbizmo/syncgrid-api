export type ProviderCategory = 'payments' | 'email';

const paymentFailoverMap: Record<string, string[]> = {
  paystack: ['stripe', 'flutterwave'],
  stripe: ['paystack', 'flutterwave'],
  flutterwave: ['paystack', 'stripe'],
};

const emailFailoverMap: Record<string, string[]> = {
  resend: ['mailgun', 'sendgrid'],
  mailgun: ['resend', 'sendgrid'],
  sendgrid: ['resend', 'mailgun'],
};

export function getProviderFailoverChain(
  category: ProviderCategory,
  primaryProvider: string,
) {
  const fallbackProviders =
    category === 'payments'
      ? paymentFailoverMap[primaryProvider] || []
      : emailFailoverMap[primaryProvider] || [];

  return {
    primaryProvider,
    fallbackProviders,
    chain: [primaryProvider, ...fallbackProviders],
  };
}

export function simulateProviderExecution(options: {
  provider: string;
  category: ProviderCategory;
  shouldFail?: boolean;
}) {
  const failover = getProviderFailoverChain(
    options.category,
    options.provider,
  );

  if (!options.shouldFail) {
    return {
      usedProvider: options.provider,
      attemptedProviders: [options.provider],
      failedOver: false,
    };
  }

  const fallbackProvider = failover.fallbackProviders[0];

  return {
    usedProvider: fallbackProvider || options.provider,
    attemptedProviders: fallbackProvider
      ? [options.provider, fallbackProvider]
      : [options.provider],
    failedOver: Boolean(fallbackProvider),
  };
}