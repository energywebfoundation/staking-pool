module.exports = {
  semi: true,
  trailingComma: "all",
  singleQuote: false,
  printWidth: 120,
  tabWidth: 2,
  overrides: [
    {
      files: "*.sol",
      options: {
        printWidth: 80,
        tabWidth: 4,
        useTabs: true,
        singleQuote: false,
        bracketSpacing: true,
        explicitTypes: "always",
      },
    },
  ],
};
