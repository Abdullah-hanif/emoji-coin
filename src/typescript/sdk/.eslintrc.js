// cspell:word nofunc
// cspell:word tsup

module.exports = {
  env: {
    browser: true,
    es2021: true,
    jest: true,
    node: true,
  },
  ignorePatterns: [
    "dist/**",
    "node_modules/**",
    ".eslintrc.js",
    "jest.config.js",
    "tsup.config.ts",
  ],
  extends: [
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ["tsconfig.json", "tests/tsconfig.json"],
    ecmaVersion: "latest",
    sourceType: "module",
    warnOnUnsupportedTypeScriptVersion: false,
  },
  plugins: ["@typescript-eslint", "unused-imports", "import", "simple-import-sort"],
  rules: {
    "@typescript-eslint/no-misused-promises": [
      "error",
      { checksVoidReturn: { attributes: false } },
    ],
    "import/no-cycle": [
      "error",
      {
        ignoreExternal: true,
      },
    ],
    "@typescript-eslint/no-explicit-any": "warn",
    "no-console": [
      "warn",
      {
        allow: ["warn", "error", "debug", "clear", "trace"],
      },
    ],
    "@typescript-eslint/lines-between-class-members": [
      "error",
      "always",
      { exceptAfterSingleLine: true },
    ],
    "@typescript-eslint/no-throw-literal": "error",
    "import/extensions": "off",
    "import/no-commonjs": ["error", { allowRequire: false, allowPrimitiveModules: false }],
    "import/no-extraneous-dependencies": [
      "error",
      {
        devDependencies: true,
        optionalDependencies: true,
        peerDependencies: true,
      },
    ],
    "import/no-useless-path-segments": ["error", { noUselessIndex: true }],
    "max-classes-per-file": ["error", 10],
    "import/prefer-default-export": "off",
    "object-curly-newline": "off",
    "no-restricted-syntax": ["error", "ForInStatement", "LabeledStatement", "WithStatement"],
    "no-use-before-define": "off",
    /**
     * Function hoisting is safe; because of this, "nofunc" is shorthand for allowing it.
     * @see {@link https://eslint.org/docs/latest/rules/no-use-before-define#options}
     */
    "@typescript-eslint/no-use-before-define": ["error", "nofunc"],
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      },
    ],
    "unused-imports/no-unused-imports": "error",
    "import/no-unused-modules": [
      "warn",
      {
        missingExports: true,
        unusedExports: true,
        ignoreExports: ["tests/**/*", "**/index.ts", "src/types/server-only.d.ts"],
      },
    ],
    "@typescript-eslint/consistent-type-imports": [
      "error",
      { prefer: "type-imports", fixStyle: "separate-type-imports", disallowTypeAnnotations: true },
    ],
    "@typescript-eslint/no-import-type-side-effects": "error",
    "simple-import-sort/imports": "error",
    "simple-import-sort/exports": "error",
    "import/first": "error",
    "import/newline-after-import": "error",
    "import/no-duplicates": "error",
  },
  settings: {
    "import/parsers": {
      "@typescript-eslint/parser": [".ts", ".tsx"],
    },
    "import/resolver": {
      typescript: {
        project: ["tsconfig.json", "tests/tsconfig.json"],
      },
      node: {
        project: ["tsconfig.json", "tests/tsconfig.json"],
      },
    },
  },
};
