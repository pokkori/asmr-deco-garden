module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // react-native-reanimated/plugin は Reanimated 4.x + New Architecture では不要
  };
};
