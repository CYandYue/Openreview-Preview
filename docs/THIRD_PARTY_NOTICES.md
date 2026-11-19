# Third-party notices

OpenReview Local Preview is distributed under **AGPL-3.0-only**. It adapts Markdown renderer behavior, MathJax configuration, and styling from OpenReview's web frontend. The code is modified for a standalone, local editor; it is not an official OpenReview product.

| Component | Version | License | Local copy |
| --- | --- | --- | --- |
| [OpenReview web](https://github.com/openreview/openreview-web) configuration and style adaptations | Referenced November 2026 | AGPL-3.0 | [License](../source/vendor/openreview-web-LICENSE.md) |
| [Marked](https://github.com/markedjs/marked) | 15.0.6 | MIT | [License](../source/vendor/marked-LICENSE.md) |
| [DOMPurify](https://github.com/cure53/DOMPurify) | 3.4.17 | Apache-2.0 OR MPL-2.0 | [Distributed license](../source/vendor/purify-LICENSE) |
| [MathJax](https://github.com/mathjax/MathJax) runtime, safe extension, and included CHTML fonts | 3.2.2 | Apache-2.0 | [License](../source/vendor/mathjax/LICENSE) |
| [Playwright](https://github.com/microsoft/playwright), development only | 1.51.1 | Apache-2.0 | Installed by npm for tests and screenshots |

The standalone build embeds the applicable runtime licenses and its build script. The preferred editable source, vendored runtime assets, and build instructions are included in this repository.

Adapted OpenReview files:

- [`client/view.js`, `setupMarked`](https://github.com/openreview/openreview-web/blob/master/client/view.js)
- [`lib/mathjax-config.js`](https://github.com/openreview/openreview-web/blob/master/lib/mathjax-config.js)
- [`app/AppInit.js`](https://github.com/openreview/openreview-web/blob/master/app/AppInit.js)
- [`lib/utils.js`, HTML allowlist](https://github.com/openreview/openreview-web/blob/master/lib/utils.js)
- [`styles/utils/_mixins.scss`, Markdown styling](https://github.com/openreview/openreview-web/blob/master/styles/utils/_mixins.scss)
