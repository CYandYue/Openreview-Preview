// SPDX-License-Identifier: AGPL-3.0-only
// Mirrors openreview-web/lib/mathjax-config.js; assets are served locally.
window.MathJax = {
  loader: { load: ['ui/safe'] },
  options: { ignoreHtmlClass: 'disable-tex-rendering' },
  tex: { inlineMath: [['$', '$'], ['\\(', '\\)']] },
  chtml: {
    scale: 1,
    minScale: 0.5,
    matchFontHeight: true,
    mtextInheritFont: false,
    merrorInheritFont: true,
    mathmlSpacing: false,
    skipAttributes: {},
    exFactor: 0.5,
    displayAlign: 'left',
    displayIndent: '0',
  },
  startup: {
    typeset: false,
    ready() {
      MathJax.startup.defaultReady();
      const { safe } = MathJax.startup.document;
      safe.filterAttributes.set('fontfamily', 'filterFamily');
      safe.filterMethods.filterFamily = (_safe, family) => family.split(/;/)[0];
    },
  },
};
