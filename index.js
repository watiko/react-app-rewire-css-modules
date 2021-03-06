const path = require('path')
const cloneDeep = require('lodash.clonedeep')
const getCSSModuleLocalIdent = require('react-dev-utils/getCSSModuleLocalIdent')

const ruleChildren = (loader) => loader.use || loader.oneOf || Array.isArray(loader.loader) && loader.loader || []

const findIndexAndRules = (rulesSource, ruleMatcher) => {
    let result = undefined
    const rules = Array.isArray(rulesSource) ? rulesSource : ruleChildren(rulesSource)
    rules.some((rule, index) => result = ruleMatcher(rule) ? {index, rules} : findIndexAndRules(ruleChildren(rule), ruleMatcher))
    return result
}

const findRule = (rulesSource, ruleMatcher) => {
    const {index, rules} = findIndexAndRules(rulesSource, ruleMatcher)
    return rules[index]
}

const cssRuleMatcher = (rule) => rule.test && String(rule.test) === String(/\.css$/)

const createLoaderMatcher = (loader) => (rule) => rule.loader && rule.loader.indexOf(`${path.sep}${loader}${path.sep}`) !== -1
const cssLoaderMatcher = createLoaderMatcher('css-loader')
const postcssLoaderMatcher = createLoaderMatcher('postcss-loader')
const fileLoaderMatcher = createLoaderMatcher('file-loader')

const addAfterRule = (rulesSource, ruleMatcher, value) => {
    const {index, rules} = findIndexAndRules(rulesSource, ruleMatcher)
    rules.splice(index + 1, 0, value)
}

const addBeforeRule = (rulesSource, ruleMatcher, value) => {
    const {index, rules} = findIndexAndRules(rulesSource, ruleMatcher)
    rules.splice(index, 0, value)
}

function rewireCssModulesFactory({ sassLoaderOptions }) {
    return function rewireCssModules(config, env) {
        const cssRule = findRule(config.module.rules, cssRuleMatcher)
        const sassRule = cloneDeep(cssRule)
        const cssModulesRule = cloneDeep(cssRule)

        cssRule.exclude = /\.module\.css$/

        const cssModulesRuleCssLoader = findRule(cssModulesRule, cssLoaderMatcher)
        cssModulesRuleCssLoader.options = Object.assign({modules: true, getLocalIdent: getCSSModuleLocalIdent}, cssModulesRuleCssLoader.options)
        addBeforeRule(config.module.rules, fileLoaderMatcher, cssModulesRule)

        sassRule.test = /\.s[ac]ss$/
        sassRule.exclude = /\.module\.s[ac]ss$/
        addAfterRule(sassRule, postcssLoaderMatcher, {
            loader: require.resolve('sass-loader'),
            options: sassLoaderOptions,
        })
        addBeforeRule(config.module.rules, fileLoaderMatcher, sassRule)

        const sassModulesRule = cloneDeep(cssModulesRule)
        sassModulesRule.test = /\.module\.s[ac]ss$/
        addAfterRule(sassModulesRule, postcssLoaderMatcher, {
            loader: require.resolve('sass-loader'),
            options: sassLoaderOptions,
        })
        addBeforeRule(config.module.rules, fileLoaderMatcher, sassModulesRule)

        return config
    }
}

const rewireCssModules = rewireCssModulesFactory({})
rewireCssModules.rewireCssModulesFactory = rewireCssModulesFactory

module.exports = rewireCssModules;
