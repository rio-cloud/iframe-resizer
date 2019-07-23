module.exports = {
    "parser": "babel-eslint",
    "parserOptions": {
        "allowImportExportEverywhere": true,
        "ecmaVersion": 6,
        "sourceType": "module",
        "ecmaFeatures": {
            "blockBindings": true,
            "experimentalObjectRestSpread": true,
            "jsx": true,
            "templateStrings": true
        }
    },
    "env": {
        "jest":true,
        "node": true,
        "browser": true,
        "es6": true
    },
    "extends": "eslint:recommended",
    "plugins": [
        "react",
        "getsentry",
        "compat"
    ],
    "settings": {
        "polyfills": [
          "fetch",
          "promises"
        ]
    },
    "rules": {
        "compat/compat": 2,
        "brace-style": 1,
        "getsentry/jsx-needs-i18n": 1,
        "comma-dangle": [
            1,
            "always-multiline"
        ],
        "curly": [
            1,
            "all"
        ],
        "func-style": [
            1,
            "declaration",
            {
                "allowArrowFunctions": true
            }
        ],
        "indent": [
            1,
            4,
            {
                "SwitchCase": 1
            }
        ],
        "linebreak-style": [
            1,
            "unix"
        ],
        "no-console": 1,
        "no-multiple-empty-lines": [
            1,
            {
                "max": 1
            }
        ],
        "no-nested-ternary": 1,
        "no-unneeded-ternary": 1,
        "no-unused-vars": 1,
        "no-template-curly-in-string": "error",
        "no-unsafe-negation": "error",
        "no-var": 1,
        "prefer-template": 1,
        "quotes": [
            1,
            "single",
            {
                "allowTemplateLiterals": true
            }
        ],
        "semi": [
            1,
            "always"
        ],
        "space-before-blocks": 1,
        "space-before-function-paren": [
            1,
            "never"
        ],
        "space-infix-ops": 1,
        "space-unary-ops": 1,
        "strict": [
            1,
            "global"
        ],
        "react/jsx-uses-react": 1,
        "react/jsx-uses-vars": 1,
        "valid-jsdoc": 1,
        "complexity": ["warn", 10],
        "dot-location": ["error", "property"],
        "eqeqeq": ["error", "always"],
        "guard-for-in": "error",
        "no-alert": "error",
        "no-caller": "error",
        "no-else-return": "warn",
        "no-eq-null": "error",
        "no-eval": "error",
        "no-extra-bind": "error",
        "no-extra-label": "error",
        "no-floating-decimal": "warn",
        "no-implicit-coercion": [2, { "allow": ["!!", "~"] } ],
        "no-implicit-globals": "error",
        "no-implied-eval": "error",
        "no-lone-blocks": "error",
        "no-loop-func": "error",
        "no-multi-spaces": "warn",
        "no-multi-str": "error",
        "no-new": "error",
        "no-new-func": "error",
        "no-new-wrappers": "error",
        "no-param-reassign": "error",
        "no-proto": "error",
        "no-return-assign": "error",
        "no-self-compare": "error",
        "no-sequences": "error",
        "no-throw-literal": "error",
        "no-unmodified-loop-condition": "error",
        "no-useless-call": "error",
        "no-useless-concat": "error",
        "no-useless-return": "error",
        "no-void": "error",
        "prefer-promise-reject-errors": ["warn", {"allowEmptyReject": true}],
        "radix": "error",
        "require-await": "error",
        "yoda": "error",
        "no-undef-init": "error",
        "global-require": "error",
        "array-bracket-spacing": ["warn", "never", { "objectsInArrays": false }],
        "comma-spacing": ["warn", { "before": false, "after": true }],
        "comma-style": ["error", "last"],
        "block-spacing": "warn",
        "camelcase": "error",
        "computed-property-spacing": ["error", "never"],
        "consistent-this": ["error", "self"],
        "func-call-spacing": ["warn", "never"],
        "jsx-quotes": ["warn", "prefer-single"],
        "key-spacing": ["warn", { "afterColon": true }],
        "keyword-spacing": ["warn", { "after": true }],
        "lines-around-comment": ["warn", { "beforeBlockComment": true }],
        "max-depth": ["error", 4],
        "max-nested-callbacks": ["error", 6],
        "max-params": ["warn", 7],
        "max-statements-per-line": ["warn", { "max": 1 }],
        "new-cap": "error",
        "no-array-constructor": "error",
        "no-continue": "error",
        "no-lonely-if": "warn",
        "no-new-object": "error",
        "no-restricted-syntax": ["error", "WithStatement", "BinaryExpression[operator='in']"],
        "no-trailing-spaces": "warn",
        "no-whitespace-before-property": "warn",
        "one-var": ["warn", "never"],
        "operator-linebreak": ["warn", "after"],
        "space-in-parens": ["warn", "never"],
        "arrow-spacing": "warn",
        "generator-star-spacing": ["warn", {"before": false, "after": true}],
        "no-duplicate-imports": ["error", { "includeExports": true }],
        "no-useless-constructor": "error",
        "prefer-const": "warn",
        "rest-spread-spacing": ["warn", "never"],
        "template-curly-spacing": "warn",
        "max-len": ["warn", 120],
        "eol-last": ["error", "always"],
        "max-lines": ["warn", 1000],
        "no-use-before-define": ["warn", { "functions": true, "classes": true }],
        "no-shadow": "error",
        "prefer-rest-params": "error",
        "default-case": "error",
        "no-bitwise": "error",
        "no-compare-neg-zero": 1,
        "object-curly-spacing": ["warn", "always"]
    },
    "globals": {
        "sinon": true,
        "mocha": true,
        "require": true
    }
};
