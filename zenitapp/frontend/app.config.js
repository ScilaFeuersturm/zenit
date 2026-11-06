module.exports = ({ config }) => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || config.extra.apiUrl;
  return {
    ...config,
    web: { ...config.web, bundler: "metro", output: "single" },
    extra: {
      ...config.extra,
      apiUrl,
      siteUrl: process.env.EXPO_PUBLIC_SITE_URL || config.extra.siteUrl,
      wsUrl: apiUrl.replace(/^http/, "ws"),
    },
  };
};
