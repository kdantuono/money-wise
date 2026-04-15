import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async () => {
  // Single locale for now — upgrade to user preference / URL routing later
  const locale = 'it';
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
